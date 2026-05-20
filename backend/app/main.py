import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.routes_auth import router as auth_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_floors import router as floors_router
from app.api.routes_sensors import ingest_router, router as sensors_router
from app.auth.dependencies import get_current_user
from app.auth.security import decode_token
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.user import User
from app.seed.seed_data import seed_database
# from app.services.simulator import simulator_loop  # Simulator da tat
from app.services.websocket_manager import ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if settings.seed_demo_data:
            seed_database(db)
    finally:
        db.close()

    # Simulator da tat - chi hien thi du lieu that tu ESP32
    try:
        yield
    finally:
        pass


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(sensors_router)
app.include_router(ingest_router)
app.include_router(floors_router)


@app.get("/")
def root():
    return {"message": "Building Safety MVP API is running"}


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.get("/me")
def me_alias(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "building_id": current_user.building_id,
        "building": {
            "id": current_user.building.id if current_user.building else None,
            "name": current_user.building.name if current_user.building else None,
            "code": current_user.building.code if current_user.building else None,
        },
        "created_at": current_user.created_at,
    }


@app.websocket("/ws/sensors")
async def sensor_socket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = db.scalar(select(User).options(joinedload(User.building)).where(User.id == int(payload["sub"])))
        if not user:
            await websocket.close(code=4401)
            return

        await ws_manager.connect(user.building_id, websocket)
        await websocket.send_json({"type": "connected", "buildingId": user.building_id, "building": user.building.name})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(user.building_id, websocket)
    except Exception:
        ws_manager.disconnect(user.building_id, websocket)
        await websocket.close(code=1011)
    finally:
        db.close()
