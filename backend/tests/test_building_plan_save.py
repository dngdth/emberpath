import json
import unittest
from types import SimpleNamespace

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.routes_floors import save_building_plans
from app.db.base import Base
from app.models import Building, Floor, FloorPlan
from app.schemas.floor import BuildingPlanSaveRequest


class BuildingPlanSaveTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        building = Building(name="Bulk save", code="BULK")
        self.db.add(building)
        self.db.flush()
        self.building_id = building.id
        self.floors = [
            Floor(building_id=building.id, name=f"Tầng {index}", order_index=index)
            for index in (1, 2)
        ]
        self.db.add_all(self.floors)
        self.db.flush()
        self.db.add_all([
            FloorPlan(building_id=building.id, floor_id=floor.id, canvas_json="[]")
            for floor in self.floors
        ])
        self.db.commit()
        self.user = SimpleNamespace(building_id=self.building_id)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def item(self, floor: Floor, status: str):
        return {
            "floor_id": floor.id,
            "objects": [
                {
                    "id": f"sensor-{floor.id}",
                    "type": "sensor",
                    "x": 10,
                    "y": 20,
                    "nodeStatus": status,
                }
            ],
            "canvas_width": 1100,
            "canvas_height": 650,
            "canvas_shape": "rect",
        }

    def test_bulk_save_requires_every_building_floor(self):
        payload = BuildingPlanSaveRequest(floors=[self.item(self.floors[0], "safe")])

        with self.assertRaises(HTTPException) as context:
            save_building_plans(payload, self.user, self.db)

        self.assertEqual(context.exception.status_code, 400)

    def test_bulk_save_persists_all_floors_together(self):
        payload = BuildingPlanSaveRequest(floors=[
            self.item(self.floors[0], "safe"),
            self.item(self.floors[1], "danger"),
        ])

        responses = save_building_plans(payload, self.user, self.db)

        self.assertEqual([response.floor_id for response in responses], [floor.id for floor in self.floors])
        plans = self.db.query(FloorPlan).order_by(FloorPlan.floor_id).all()
        statuses = [json.loads(plan.canvas_json)[0]["nodeStatus"] for plan in plans]
        self.assertEqual(statuses, ["safe", "danger"])
        self.assertTrue(all(plan.canvas_width == 1100 for plan in plans))


if __name__ == "__main__":
    unittest.main()
