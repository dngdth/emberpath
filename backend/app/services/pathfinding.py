import json
import math
import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.plan import FloorPlan
from app.models.sensor import SensorDevice

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
            w, h = obj.get("width", 0), obj.get("height", 0)
            for p in danger_points:
                if x <= p["x"] <= x + w and y <= p["y"] <= y + h:
                    danger_nodes.add(obj.get("id"))
                    break
    
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
                # Calculate distance
                dist = math.hypot(node_u.get("x", 0) - node_v.get("x", 0), node_u.get("y", 0) - node_v.get("y", 0))
                
                # Apply danger penalty: if passing through a danger room, penalty is huge
                # Note: we allow start node to be in danger so they can escape!
                penalty = 0
                if u in danger_nodes and u != start_node_id and u != end_node_id:
                    penalty += 1e6
                if v in danger_nodes and v != start_node_id and v != end_node_id:
                    penalty += 1e6
                    
                weight = dist + penalty
                G.add_edge(u, v, weight=weight)
                
    if start_node_id not in G or end_node_id not in G:
        raise ValueError("Start or end node not found in graph")
        
    try:
        path = nx.shortest_path(G, source=start_node_id, target=end_node_id, weight='weight')
        return path
    except nx.NetworkXNoPath:
        raise ValueError("No path found between the nodes")
