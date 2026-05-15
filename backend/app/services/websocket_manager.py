from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class BuildingConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, building_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[building_id].add(websocket)

    def disconnect(self, building_id: int, websocket: WebSocket) -> None:
        self.active_connections[building_id].discard(websocket)
        if not self.active_connections[building_id]:
            self.active_connections.pop(building_id, None)

    async def broadcast_to_building(self, building_id: int, message: dict[str, Any]) -> None:
        dead_connections: list[WebSocket] = []
        for connection in self.active_connections.get(building_id, set()):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for connection in dead_connections:
            self.disconnect(building_id, connection)


ws_manager = BuildingConnectionManager()
