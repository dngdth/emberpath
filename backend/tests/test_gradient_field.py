import json
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models import Building, Floor, FloorPlan
from app.services.gradient_field import GradientEdge, GradientFieldRouter
from app.services.pathfinding import find_safe_path


class GradientFieldRouterTests(unittest.TestCase):
    def test_gradient_follows_lowest_hop_count_to_exit(self):
        edges = [
            GradientEdge("start", "a", "start-a"),
            GradientEdge("a", "exit", "a-exit"),
            GradientEdge("start", "b", "start-b"),
            GradientEdge("b", "c", "b-c"),
            GradientEdge("c", "exit", "c-exit"),
        ]
        route = GradientFieldRouter({"start", "a", "b", "c", "exit"}, edges, {"exit"}).route("start")

        self.assertEqual(route.nodes, ["start", "a", "exit"])
        self.assertEqual([edge.payload for edge in route.edges], ["start-a", "a-exit"])
        self.assertEqual(route.costs["start"], 2.0)

    def test_danger_node_is_removed_and_safe_branch_is_used(self):
        edges = [
            GradientEdge("start", "danger"),
            GradientEdge("danger", "exit"),
            GradientEdge("start", "safe-a"),
            GradientEdge("safe-a", "safe-b"),
            GradientEdge("safe-b", "exit"),
        ]
        route = GradientFieldRouter(
            {"start", "danger", "safe-a", "safe-b", "exit"},
            edges,
            {"exit"},
            blocked={"danger"},
        ).route("start")

        self.assertEqual(route.nodes, ["start", "safe-a", "safe-b", "exit"])

    def test_disconnected_nodes_do_not_receive_a_route(self):
        router = GradientFieldRouter({"start", "exit"}, [], {"exit"})
        with self.assertRaisesRegex(ValueError, "No LED-wire path"):
            router.route("start")


class FloorPlanTopologyTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        building = Building(name="Test", code="TEST")
        self.db.add(building)
        self.db.flush()
        floor = Floor(building_id=building.id, name="Tầng test", order_index=1)
        self.db.add(floor)
        self.db.flush()
        self.building_id = building.id
        self.floor_id = floor.id
        self.plan = FloorPlan(building_id=building.id, floor_id=floor.id, canvas_json="[]")
        self.db.add(self.plan)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def save_objects(self, objects):
        self.plan.canvas_json = json.dumps(objects)
        self.db.commit()

    @staticmethod
    def node(node_id, node_type, x, *, danger=False, name=None, target_floor_id=None):
        result = {"id": node_id, "type": node_type, "x": x, "y": 0}
        if danger:
            result["nodeStatus"] = "danger"
        if name:
            result["name"] = name
        if target_floor_id:
            result["target_floor_id"] = target_floor_id
        return result

    @staticmethod
    def wire(wire_id, left, right, *, from_id=None, to_id=None):
        result = {
            "id": wire_id,
            "type": "led_wire",
            "x": 0,
            "y": 0,
            "points": [left, 18, right, 18],
        }
        if from_id:
            result["fromNodeId"] = from_id
        if to_id:
            result["toNodeId"] = to_id
        return result

    def test_legacy_connector_does_not_create_a_led_route(self):
        self.save_objects([
            self.node("start", "sensor", 0),
            self.node("exit", "exit", 200),
            {"id": "old-link", "type": "connector", "x": 0, "y": 0, "fromNodeId": "start", "toNodeId": "exit"},
        ])

        result = find_safe_path(self.db, self.building_id, self.floor_id, "start")

        self.assertEqual(result["segments"], [])

    def test_led_wire_is_resolved_from_geometric_endpoints(self):
        self.save_objects([
            {"id": "start", "type": "sensor", "x": 0, "y": 0, "width": 48, "height": 48},
            {"id": "exit", "type": "exit", "x": 200, "y": 0, "width": 80, "height": 40},
            {"id": "wire", "type": "led_wire", "x": 24, "y": 20, "points": [0, 4, 216, 0]},
        ])

        result = find_safe_path(self.db, self.building_id, self.floor_id, "start")

        self.assertEqual({node["node_id"] for node in result["nodes"]}, {"start", "exit"})
        self.assertEqual(result["segments"][0]["wire_id"], "wire")

    def test_parallel_led_wires_do_not_break_gradient_tie_resolution(self):
        self.save_objects([
            self.node("start", "sensor", 0),
            self.node("exit", "exit", 200),
            self.wire("wire-a", 18, 240, from_id="start", to_id="exit"),
            self.wire("wire-b", 18, 240, from_id="start", to_id="exit"),
        ])

        result = find_safe_path(self.db, self.building_id, self.floor_id, "start")

        self.assertEqual(result["mode"], "exit")
        self.assertEqual(len(result["segments"]), 2)
        self.assertEqual(
            {segment["wire_id"] for segment in result["segments"]},
            {"wire-a", "wire-b"},
        )

    def test_every_safe_led_wire_is_classified_green(self):
        self.save_objects([
            self.node("a", "sensor", 0),
            self.node("b", "sensor", 100),
            self.node("exit", "exit", 200),
            self.wire("a-b", 18, 118, from_id="a", to_id="b"),
            self.wire("b-exit", 118, 240, from_id="b", to_id="exit"),
            self.wire("a-exit", 18, 240, from_id="a", to_id="exit"),
        ])

        result = find_safe_path(self.db, self.building_id, self.floor_id, "a")

        self.assertEqual(
            {segment["wire_id"] for segment in result["segments"]},
            {"a-b", "b-exit", "a-exit"},
        )
        self.assertTrue(all(segment["status"] == "safe" for segment in result["segments"]))

    def test_no_exit_falls_back_to_farthest_node_from_fire(self):
        self.save_objects([
            self.node("fire", "sensor", 0, danger=True),
            self.node("a", "sensor", 100),
            self.node("b", "sensor", 200),
            self.node("c", "sensor", 300),
            self.wire("fire-a", 18, 118, from_id="fire", to_id="a"),
            self.wire("a-b", 118, 218, from_id="a", to_id="b"),
            self.wire("b-c", 218, 318, from_id="b", to_id="c"),
        ])

        result = find_safe_path(self.db, self.building_id, self.floor_id, "fire")

        self.assertEqual(result["mode"], "fallback")
        self.assertEqual(result["destination_nodes"][0]["node_id"], "c")
        fire_segment = next(segment for segment in result["segments"] if segment["wire_id"] == "fire-a")
        self.assertEqual(fire_segment["status"], "danger")
        self.assertEqual((fire_segment["from_node_id"], fire_segment["to_node_id"]), ("fire", "a"))

    def test_fire_wire_is_red_and_reversed_away_from_fire(self):
        self.save_objects([
            self.node("safe", "sensor", 0),
            self.node("fire", "sensor", 100, danger=True),
            self.node("safe-2", "sensor", 200),
            self.wire("wire", 18, 118, from_id="safe", to_id="fire"),
            self.wire("wire-2", 118, 218, from_id="fire", to_id="safe-2"),
        ])

        result = find_safe_path(self.db, self.building_id, self.floor_id, "fire")

        self.assertEqual(len(result["segments"]), 2)
        self.assertTrue(all(segment["status"] == "danger" for segment in result["segments"]))
        segment = next(segment for segment in result["segments"] if segment["wire_id"] == "wire")
        self.assertEqual(segment["status"], "danger")
        self.assertEqual((segment["from_node_id"], segment["to_node_id"]), ("fire", "safe"))
        self.assertTrue(segment["reverse"])

    def test_stairs_link_guidance_across_floors(self):
        second_floor = Floor(building_id=self.building_id, name="Tầng 2", order_index=2)
        self.db.add(second_floor)
        self.db.flush()
        self.save_objects([
            self.node("stairs-1", "stairs", 0, name="Cầu thang A"),
            self.node("exit-1", "exit", 200),
            self.wire("wire-1", 40, 240, from_id="stairs-1", to_id="exit-1"),
        ])
        self.db.add(FloorPlan(
            building_id=self.building_id,
            floor_id=second_floor.id,
            canvas_json=json.dumps([
                self.node("start-2", "sensor", 0),
                self.node("stairs-2", "stairs", 200, name="Cầu thang A", target_floor_id=self.floor_id),
                self.wire("wire-2", 18, 240, from_id="start-2", to_id="stairs-2"),
            ]),
        ))
        self.db.commit()

        result = find_safe_path(self.db, self.building_id, second_floor.id, "start-2")

        self.assertEqual(result["mode"], "exit")
        self.assertTrue(any(segment["kind"] == "stairs" for segment in result["segments"]))
        led_floors = {
            segment["floor_id"]
            for segment in result["segments"]
            if segment["kind"] == "led_wire"
        }
        self.assertEqual(led_floors, {self.floor_id, second_floor.id})


if __name__ == "__main__":
    unittest.main()
