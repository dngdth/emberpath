import json
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.seed.seed_data import seed_database
from app.services.pathfinding import find_safe_path
from app.models.plan import FloorPlan
from app.models.sensor import SensorDevice

def run_test():
    # Initialize DB for test
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    
    # We assume building 1, floor 1 exists
    building_id = 1
    floor_id = 1
    
    plan = db.query(FloorPlan).filter(FloorPlan.floor_id == floor_id).first()
    if not plan:
        print("Plan not found!")
        return
        
    objects = json.loads(plan.canvas_json or "[]")
    
    # Add connectors to objects
    # Let's say: 
    # node A: room-lobby
    # node B: door-1
    # node C: exit-1
    # We connect lobby -> door -> exit
    
    # Add connectors
    connectors = [
        {
            "id": "c1",
            "type": "connector",
            "fromNodeId": "room-lobby",
            "toNodeId": "door-1"
        },
        {
            "id": "c2",
            "type": "connector",
            "fromNodeId": "door-1",
            "toNodeId": "exit-1"
        }
    ]
    objects.extend(connectors)
    
    plan.canvas_json = json.dumps(objects)
    db.commit()
    
    # Test safe path
    try:
        path = find_safe_path(db, building_id, floor_id, "room-lobby", "exit-1")
        print(f"Path when safe: {path}")
    except Exception as e:
        print(f"Error: {e}")
        
    # Now set mq2-01 in Lobby to danger
    device = db.query(SensorDevice).filter(SensorDevice.device_id == "mq2-01").first()
    if device:
        print("Setting mq2-01 to danger...")
        device.latest_status = "danger"
        db.commit()
        
    # Test danger path
    try:
        path2 = find_safe_path(db, building_id, floor_id, "door-1", "exit-1")
        print(f"Path when danger (from door to exit): {path2}")
    except Exception as e:
        print(f"Error: {e}")
        
    try:
        path3 = find_safe_path(db, building_id, floor_id, "room-lobby", "exit-1")
        print(f"Path when danger (starting in danger room): {path3}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_test()
