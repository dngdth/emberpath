from __future__ import annotations

import json
import math
import re
from collections import deque
from dataclasses import dataclass
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.floor import Floor
from app.models.plan import FloorPlan
from app.models.sensor import SensorDevice
from app.services.gradient_field import GradientEdge, GradientFieldRouter


NodeKey = tuple[int, str]
ROUTABLE_TYPES = {"room", "sensor", "mq2", "temp", "led", "stairs", "exit"}
DEFAULT_SIZES: dict[str, tuple[float, float]] = {
    "room": (240.0, 140.0),
    "sensor": (48.0, 48.0),
    "mq2": (40.0, 40.0),
    "temp": (40.0, 40.0),
    "led": (18.0, 18.0),
    "stairs": (80.0, 60.0),
    "exit": (80.0, 36.0),
}
WIRE_ENDPOINT_TOLERANCE = 32.0
PHYSICAL_SENSOR_NODE_PATTERN = re.compile(r"^(?:master|sat-\d+)$")


@dataclass(frozen=True)
class RoutingNode:
    key: NodeKey
    floor_name: str
    object: dict[str, Any]


@dataclass(frozen=True)
class RoutingLink:
    kind: str
    floor_id: int | None
    wire_id: str | None


def _physical_sensor_node_id(identifier: str) -> str:
    """Map the temperature and MQ2 channels of one ESP32 to one route node."""

    for prefix in ("temp-", "mq2-"):
        if identifier.startswith(prefix):
            node_id = identifier.removeprefix(prefix)
            if PHYSICAL_SENSOR_NODE_PATTERN.fullmatch(node_id):
                return node_id
    return identifier


def _sensor_device_matches_node(device_id: str, node_id: str) -> bool:
    return (
        device_id == node_id
        or _physical_sensor_node_id(device_id) == _physical_sensor_node_id(node_id)
    )


def _object_size(obj: dict[str, Any]) -> tuple[float, float]:
    default_width, default_height = DEFAULT_SIZES.get(obj.get("type", ""), (40.0, 40.0))
    return float(obj.get("width") or default_width), float(obj.get("height") or default_height)


def _object_center(obj: dict[str, Any]) -> tuple[float, float]:
    width, height = _object_size(obj)
    return float(obj.get("x", 0)) + width / 2, float(obj.get("y", 0)) + height / 2


def _distance_to_object(point: tuple[float, float], obj: dict[str, Any]) -> float:
    px, py = point
    x, y = float(obj.get("x", 0)), float(obj.get("y", 0))
    width, height = _object_size(obj)
    dx = max(x - px, 0.0, px - (x + width))
    dy = max(y - py, 0.0, py - (y + height))
    return math.hypot(dx, dy)


def _wire_absolute_endpoints(wire: dict[str, Any]) -> tuple[tuple[float, float], tuple[float, float]] | None:
    points = wire.get("points") or []
    if len(points) < 4:
        return None
    origin_x = float(wire.get("x", 0))
    origin_y = float(wire.get("y", 0))
    return (
        (origin_x + float(points[0]), origin_y + float(points[1])),
        (origin_x + float(points[-2]), origin_y + float(points[-1])),
    )


def _resolve_wire_endpoint(
    explicit_node_id: str | None,
    point: tuple[float, float],
    floor_nodes: dict[str, RoutingNode],
) -> RoutingNode | None:
    if explicit_node_id and explicit_node_id in floor_nodes:
        return floor_nodes[explicit_node_id]

    candidates = [
        (_distance_to_object(point, node.object), math.dist(point, _object_center(node.object)), node.key[1], node)
        for node in floor_nodes.values()
    ]
    if not candidates:
        return None
    boundary_distance, _, _, nearest = min(candidates)
    return nearest if boundary_distance <= WIRE_ENDPOINT_TOLERANCE else None


def resolve_floor_led_wires(
    objects: list[dict[str, Any]],
    floor_id: int = 0,
    floor_name: str = "",
) -> list[dict[str, Any]]:
    """Attach stable node ids to freehand LED wires whose endpoints touch nodes."""

    resolved = [dict(obj) for obj in objects]
    floor_nodes = {
        str(obj["id"]): RoutingNode((floor_id, str(obj["id"])), floor_name, obj)
        for obj in resolved
        if obj.get("id") and obj.get("type") in ROUTABLE_TYPES and obj.get("visible", True)
    }
    for wire in resolved:
        if wire.get("type") != "led_wire" or wire.get("visible", True) is False:
            continue
        endpoints = _wire_absolute_endpoints(wire)
        if endpoints is None:
            continue
        left = _resolve_wire_endpoint(wire.get("fromNodeId"), endpoints[0], floor_nodes)
        right = _resolve_wire_endpoint(wire.get("toNodeId"), endpoints[1], floor_nodes)
        if left is not None and right is not None and left.key != right.key:
            wire["fromNodeId"] = left.key[1]
            wire["toNodeId"] = right.key[1]
    return resolved


def _normalise_stair_name(obj: dict[str, Any]) -> str:
    return str(obj.get("name") or "stairs").strip().casefold()


def _load_topology(
    db: Session,
    building_id: int,
) -> tuple[dict[NodeKey, RoutingNode], list[GradientEdge], set[NodeKey]]:
    plans = db.scalars(
        select(FloorPlan)
        .join(Floor, Floor.id == FloorPlan.floor_id)
        .where(FloorPlan.building_id == building_id)
        .order_by(Floor.order_index.asc(), Floor.id.asc())
    ).all()
    if not plans:
        raise ValueError("Không tìm thấy sơ đồ tầng cho tòa nhà")

    floors = {
        floor.id: floor
        for floor in db.scalars(select(Floor).where(Floor.building_id == building_id)).all()
    }
    objects_by_floor: dict[int, list[dict[str, Any]]] = {}
    nodes: dict[NodeKey, RoutingNode] = {}

    for plan in plans:
        try:
            raw_objects = json.loads(plan.canvas_json or "[]")
        except json.JSONDecodeError as exc:
            raise ValueError(f"Sơ đồ tầng {plan.floor_id} chứa JSON không hợp lệ") from exc
        floor_name = floors[plan.floor_id].name
        objects = resolve_floor_led_wires(raw_objects, plan.floor_id, floor_name)
        objects_by_floor[plan.floor_id] = objects
        for obj in objects:
            object_id = obj.get("id")
            if object_id and obj.get("type") in ROUTABLE_TYPES and obj.get("visible", True):
                key = (plan.floor_id, str(object_id))
                nodes[key] = RoutingNode(key=key, floor_name=floor_name, object=obj)

    edges: list[GradientEdge] = []

    # A LED wire is the only same-floor object that creates a graph edge.
    for floor_id, objects in objects_by_floor.items():
        floor_nodes = {node_id: node for (node_floor, node_id), node in nodes.items() if node_floor == floor_id}
        for wire in objects:
            if wire.get("type") != "led_wire" or wire.get("visible", True) is False:
                continue
            endpoints = _wire_absolute_endpoints(wire)
            if endpoints is None:
                continue
            left = _resolve_wire_endpoint(wire.get("fromNodeId"), endpoints[0], floor_nodes)
            right = _resolve_wire_endpoint(wire.get("toNodeId"), endpoints[1], floor_nodes)
            if left is None or right is None or left.key == right.key:
                continue
            edges.append(
                GradientEdge(
                    left=left.key,
                    right=right.key,
                    payload=RoutingLink(
                        kind="led_wire",
                        floor_id=floor_id,
                        wire_id=str(wire.get("id")) if wire.get("id") else None,
                    ),
                )
            )

    # Same-name stairs form bidirectional inter-floor links. Every staircase
    # still needs a LED wire on its own floor before it joins the guidance tree.
    stair_nodes = [node for node in nodes.values() if node.object.get("type") == "stairs"]
    stair_edges: set[frozenset[NodeKey]] = set()
    for stair in stair_nodes:
        target_floor_id = stair.object.get("target_floor_id")
        if not target_floor_id:
            continue
        target_stairs = [
            candidate
            for candidate in stair_nodes
            if candidate.key[0] == int(target_floor_id)
        ]
        candidates = [
            candidate
            for candidate in target_stairs
            if _normalise_stair_name(candidate.object) == _normalise_stair_name(stair.object)
        ]
        # A single staircase on the target floor is unambiguous even if the
        # labels differ. With multiple stairs we require matching names.
        if not candidates and len(target_stairs) == 1:
            candidates = target_stairs
        if len(candidates) != 1:
            continue
        pair = frozenset((stair.key, candidates[0].key))
        if pair in stair_edges:
            continue
        stair_edges.add(pair)
        edges.append(
            GradientEdge(
                left=stair.key,
                right=candidates[0].key,
                payload=RoutingLink(kind="stairs", floor_id=None, wire_id=None),
            )
        )

    sensor_devices = db.scalars(
        select(SensorDevice).where(SensorDevice.building_id == building_id)
    ).all()
    hazards: set[NodeKey] = set()
    sensor_node_types = {"sensor", "mq2", "temp"}
    for key, node in nodes.items():
        matching_devices = [
            device
            for device in sensor_devices
            if _sensor_device_matches_node(device.device_id, key[1])
        ]
        if matching_devices and node.object.get("type") in sensor_node_types:
            # Realtime readings are authoritative for registered sensor nodes.
            if any(device.latest_status == "danger" for device in matching_devices):
                hazards.add(key)
        elif node.object.get("nodeStatus") == "danger":
            # Keep manual/static danger support for objects without a live device.
            hazards.add(key)
    return nodes, edges, hazards


def _adjacency(node_keys: Iterable[NodeKey], edges: Iterable[GradientEdge]) -> dict[NodeKey, list[NodeKey]]:
    adjacency = {key: [] for key in node_keys}
    for edge in edges:
        if edge.left in adjacency and edge.right in adjacency:
            adjacency[edge.left].append(edge.right)
            adjacency[edge.right].append(edge.left)
    for neighbours in adjacency.values():
        neighbours.sort(key=str)
    return adjacency


def _components(node_keys: set[NodeKey], edges: list[GradientEdge]) -> list[set[NodeKey]]:
    adjacency = _adjacency(node_keys, edges)
    pending = set(node_keys)
    components: list[set[NodeKey]] = []
    while pending:
        root = min(pending, key=str)
        component: set[NodeKey] = set()
        queue = deque([root])
        while queue:
            current = queue.popleft()
            if current in component:
                continue
            component.add(current)
            pending.discard(current)
            queue.extend(neighbour for neighbour in adjacency[current] if neighbour not in component)
        components.append(component)
    return components


def _distances(
    component: set[NodeKey],
    edges: list[GradientEdge],
    sources: set[NodeKey],
) -> dict[NodeKey, int]:
    adjacency = _adjacency(component, edges)
    distances = {source: 0 for source in sources if source in component}
    queue = deque(sorted(distances, key=str))
    while queue:
        current = queue.popleft()
        for neighbour in adjacency[current]:
            if neighbour not in distances:
                distances[neighbour] = distances[current] + 1
                queue.append(neighbour)
    return distances


def _fallback_destination(
    component: set[NodeKey],
    component_edges: list[GradientEdge],
    hazard_neighbours: set[NodeKey],
    start: NodeKey,
) -> NodeKey:
    sources = component & hazard_neighbours
    if not sources and start in component:
        sources = {start}
    if not sources:
        sources = {min(component, key=str)}

    distances = _distances(component, component_edges, sources)
    first_farthest = max(distances, key=lambda key: (distances[key], str(key)))

    # With no fire-adjacent source, use a second sweep to reach a peripheral
    # node instead of choosing an arbitrary point in the component.
    if not (component & hazard_neighbours) and start not in component:
        distances = _distances(component, component_edges, {first_farthest})
    return max(distances, key=lambda key: (distances[key], str(key)))


def _node_response(nodes: dict[NodeKey, RoutingNode], key: NodeKey, cost: float) -> dict[str, Any]:
    return {
        "floor_id": key[0],
        "floor_name": nodes[key].floor_name,
        "node_id": key[1],
        "node_name": nodes[key].object.get("name"),
        "cost": cost,
    }


def _segment_response(
    edge: GradientEdge,
    route_from: NodeKey,
    route_to: NodeKey,
    status: str,
) -> dict[str, Any]:
    link = edge.payload
    assert isinstance(link, RoutingLink)
    return {
        "kind": link.kind,
        "status": status,
        "floor_id": link.floor_id,
        "wire_id": link.wire_id,
        "from_floor_id": route_from[0],
        "to_floor_id": route_to[0],
        "from_node_id": route_from[1],
        "to_node_id": route_to[1],
        "reverse": route_from != edge.left,
    }


def _direct_route(
    nodes: dict[NodeKey, RoutingNode],
    edges: list[GradientEdge],
    hazards: set[NodeKey],
    start: NodeKey,
    destination: NodeKey,
) -> dict[str, Any]:
    router = GradientFieldRouter(nodes, edges, {destination}, blocked=hazards - {start})
    route = router.route(start)
    segments = [
        _segment_response(
            edge,
            route.nodes[index],
            route.nodes[index + 1],
            "danger" if route.nodes[index] in hazards else "safe",
        )
        for index, edge in enumerate(route.edges)
    ]
    return {
        "algorithm": "gradient_field",
        "mode": "exit" if nodes[destination].object.get("type") == "exit" else "target",
        "nodes": [_node_response(nodes, key, route.costs[key]) for key in route.nodes],
        "segments": segments,
        "hazard_nodes": [_node_response(nodes, key, 0.0) for key in sorted(hazards, key=str)],
        "destination_nodes": [_node_response(nodes, destination, 0.0)],
        "total_hops": len(route.edges),
        "convergence_iterations": route.iterations,
    }


def _guidance_forest(
    nodes: dict[NodeKey, RoutingNode],
    edges: list[GradientEdge],
    hazards: set[NodeKey],
    start: NodeKey,
) -> dict[str, Any]:
    safe_nodes = set(nodes) - hazards
    safe_edges = [edge for edge in edges if edge.left in safe_nodes and edge.right in safe_nodes]
    exit_nodes = {key for key in safe_nodes if nodes[key].object.get("type") == "exit"}
    hazard_neighbours = {
        edge.right if edge.left in hazards else edge.left
        for edge in edges
        if (edge.left in hazards) != (edge.right in hazards)
    }

    segments: list[dict[str, Any]] = []
    node_costs: dict[NodeKey, float] = {key: 0.0 for key in hazards}
    destinations: set[NodeKey] = set()
    component_modes: set[str] = set()
    max_iterations = 0

    # Every physical LED wire leaving a fire sensor is red and points away
    # from that sensor, independently of which safe branch is eventually used.
    for edge in edges:
        link = edge.payload
        if not isinstance(link, RoutingLink) or link.kind != "led_wire":
            continue
        if edge.left in hazards and edge.right not in hazards:
            segments.append(_segment_response(edge, edge.left, edge.right, "danger"))
        elif edge.right in hazards and edge.left not in hazards:
            segments.append(_segment_response(edge, edge.right, edge.left, "danger"))
        elif edge.left in hazards and edge.right in hazards:
            segments.append(_segment_response(edge, edge.left, edge.right, "danger"))

    for component in _components(safe_nodes, safe_edges):
        component_edges = [
            edge for edge in safe_edges if edge.left in component and edge.right in component
        ]
        component_exits = component & exit_nodes
        if component_exits:
            sinks = component_exits
            component_modes.add("exit")
        else:
            sinks = {
                _fallback_destination(component, component_edges, hazard_neighbours, start)
            }
            component_modes.add("fallback")
        destinations.update(sinks)

        costs, _, iterations = GradientFieldRouter(
            component,
            component_edges,
            sinks,
        ).converge()
        max_iterations = max(max_iterations, iterations)
        node_costs.update(costs)

        # Classify every safe physical link, not only the parent edges chosen
        # for the shortest-path tree. This guarantees that activation leaves
        # no valid LED wire in its default/purple state.
        for edge in component_edges:
            left_cost = costs[edge.left]
            right_cost = costs[edge.right]
            if left_cost > right_cost:
                route_from, route_to = edge.left, edge.right
            elif right_cost > left_cost:
                route_from, route_to = edge.right, edge.left
            elif str(edge.left) > str(edge.right):
                route_from, route_to = edge.left, edge.right
            else:
                route_from, route_to = edge.right, edge.left
            segments.append(_segment_response(edge, route_from, route_to, "safe"))

    if component_modes == {"exit"}:
        mode = "exit"
    elif component_modes == {"fallback"}:
        mode = "fallback"
    else:
        mode = "mixed"

    return {
        "algorithm": "gradient_field",
        "mode": mode,
        "nodes": [
            _node_response(nodes, key, node_costs.get(key, 0.0))
            for key in sorted(node_costs, key=str)
        ],
        "segments": segments,
        "hazard_nodes": [_node_response(nodes, key, 0.0) for key in sorted(hazards, key=str)],
        "destination_nodes": [
            _node_response(nodes, key, 0.0) for key in sorted(destinations, key=str)
        ],
        "total_hops": len(segments),
        "convergence_iterations": max_iterations,
    }


def find_safe_path(
    db: Session,
    building_id: int,
    floor_id: int,
    start_node_id: str,
    end_node_id: str | None = None,
) -> dict[str, Any]:
    nodes, edges, hazards = _load_topology(db, building_id)
    start: NodeKey = (floor_id, start_node_id)
    if start not in nodes:
        matching_starts = [
            key
            for key in nodes
            if key[0] == floor_id and _sensor_device_matches_node(start_node_id, key[1])
        ]
        if len(matching_starts) == 1:
            start = matching_starts[0]
        else:
            raise ValueError("Điểm bắt đầu không tồn tại trên tầng đã chọn")

    if end_node_id:
        destination: NodeKey = (floor_id, end_node_id)
        if destination not in nodes:
            raise ValueError("Điểm kết thúc không tồn tại trên tầng đã chọn")
        try:
            return _direct_route(nodes, edges, hazards, start, destination)
        except ValueError as exc:
            raise ValueError(
                "Không có chuỗi dây LED liên tục giữa hai node đã chọn."
            ) from exc

    return _guidance_forest(nodes, edges, hazards, start)
