import json
import math
import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.plan import FloorPlan
from app.models.sensor import SensorDevice

def ccw(A, B, C):
    return (C["y"] - A["y"]) * (B["x"] - A["x"]) > (B["y"] - A["y"]) * (C["x"] - A["x"])

def intersect_segments(A, B, C, D):
    return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)

def get_rotated_corners(wall):
    x = wall.get("x", 0)
    y = wall.get("y", 0)
    w = wall.get("width", 160)
    h = wall.get("height", 16)
    angle = math.radians(wall.get("rotation", 0))
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    
    pts = [
        {"x": 0, "y": 0},
        {"x": w, "y": 0},
        {"x": w, "y": h},
        {"x": 0, "y": h}
    ]
    
    rotated = []
    for p in pts:
        rx = p["x"] * cos_a - p["y"] * sin_a
        ry = p["x"] * sin_a + p["y"] * cos_a
        rotated.append({"x": x + rx, "y": y + ry})
    return rotated

def connector_intersects_wall(node_u, node_v, wall):
    u_type = node_u.get("type", "label")
    v_type = node_v.get("type", "label")
    
    # Bounding box fallbacks
    u_w = node_u.get("width", 240 if u_type == "room" else 40)
    u_h = node_u.get("height", 140 if u_type == "room" else 40)
    v_w = node_v.get("width", 240 if v_type == "room" else 40)
    v_h = node_v.get("height", 140 if v_type == "room" else 40)

    A = {"x": node_u.get("x", 0) + u_w / 2, "y": node_u.get("y", 0) + u_h / 2}
    B = {"x": node_v.get("x", 0) + v_w / 2, "y": node_v.get("y", 0) + v_h / 2}
    
    corners = get_rotated_corners(wall)
    for i in range(4):
        C = corners[i]
        D = corners[(i + 1) % 4]
        if intersect_segments(A, B, C, D):
            return True
    return False

def is_point_in_polygon(px, py, poly):
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]["x"], poly[0]["y"]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]["x"], poly[i % n]["y"]
        if py > min(p1y, p2y):
            if py <= max(p1y, p2y):
                if px <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (py - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or px <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def find_safe_path(db: Session, building_id: int, floor_id: int, start_node_id: str, end_node_id: str) -> list[str]:
    plan = db.scalar(select(FloorPlan).where(FloorPlan.floor_id == floor_id, FloorPlan.building_id == building_id))
    if not plan:
        raise ValueError("Floor plan not found")
        
    objects = json.loads(plan.canvas_json or "[]")
    
    # Identify danger devices
    devices = db.scalars(select(SensorDevice).where(
        SensorDevice.floor_id == floor_id,
        SensorDevice.latest_status == "danger"
    )).all()
    danger_device_ids = {d.device_id for d in devices}
    
    # Find danger areas (rectangles of rooms containing danger sensors)
    danger_points = []
    for obj in objects:
        if obj.get("id") in danger_device_ids:
            danger_points.append({"x": obj.get("x", 0), "y": obj.get("y", 0)})
    
    danger_nodes = set()
    # Add the devices themselves to danger nodes
    danger_nodes.update(danger_device_ids)
    
    for obj in objects:
        if obj.get("type") == "room":
            x, y = obj.get("x", 0), obj.get("y", 0)
            shape_type = obj.get("shapeType", "rect")
            rel_points = obj.get("points")
            
            if shape_type == "polygon" and rel_points and len(rel_points) >= 6:
                # Convert to absolute points
                poly = [{"x": x + rel_points[i], "y": y + rel_points[i+1]} for i in range(0, len(rel_points), 2)]
                for p in danger_points:
                    if is_point_in_polygon(p["x"], p["y"], poly):
                        danger_nodes.add(obj.get("id"))
                        break
            else:
                # Bounding box fallback
                w, h = obj.get("width", 240), obj.get("height", 140)
                for p in danger_points:
                    if x <= p["x"] <= x + w and y <= p["y"] <= y + h:
                        danger_nodes.add(obj.get("id"))
                        break
    
    # Gather walls/obstacles
    walls = [obj for obj in objects if obj.get("type") == "wall"]
    
    G = nx.Graph()
    nodes_dict = {}
    
    # Add all nodes
    for obj in objects:
        if obj.get("type") not in ["connector", "label"]:
            obj_id = obj.get("id")
            if not obj_id:
                continue
            nodes_dict[obj_id] = obj
            G.add_node(obj_id)
            
    # Add edges from connectors
    for obj in objects:
        if obj.get("type") == "connector":
            u = obj.get("fromNodeId")
            v = obj.get("toNodeId")
            if u and v and u in nodes_dict and v in nodes_dict:
                node_u = nodes_dict[u]
                node_v = nodes_dict[v]
                
                # Check wall intersection
                intersects_wall = any(connector_intersects_wall(node_u, node_v, w) for w in walls)
                
                # Calculate distance
                dist = math.hypot(node_u.get("x", 0) - node_v.get("x", 0), node_u.get("y", 0) - node_v.get("y", 0))
                
                # Apply danger penalty: if passing through a danger room, penalty is huge
                # Note: we allow start node to be in danger so they can escape!
                penalty = 0
                if u in danger_nodes and u != start_node_id and u != end_node_id:
                    penalty += 1e6
                if v in danger_nodes and v != start_node_id and v != end_node_id:
                    penalty += 1e6
                
                # Apply wall collision penalty
                if intersects_wall:
                    penalty += 1e12
                    
                weight = dist + penalty
                G.add_edge(u, v, weight=weight)
                
    if start_node_id not in G or end_node_id not in G:
        raise ValueError("Start or end node not found in graph")
        
    try:
        path = nx.shortest_path(G, source=start_node_id, target=end_node_id, weight='weight')
        return path
    except nx.NetworkXNoPath:
        raise ValueError("No path found between the nodes")
