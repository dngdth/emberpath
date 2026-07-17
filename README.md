# Building Safety MVP

MVP full-stack cho dự án **hệ thống giám sát an toàn tòa nhà và thiết kế sơ đồ mạng lưới LED**.

## Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, Pydantic, JWT, WebSocket
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, React Konva

## Cấu trúc project

```text
building-safety-mvp/
  backend/
    app/
      api/
      auth/
      core/
      db/
      models/
      schemas/
      services/
      seed/
      utils/
      main.py
    requirements.txt
  frontend/
    src/
      components/
      data/
      hooks/
      pages/
      router/
      store/
      types/
      utils/
      App.tsx
      main.tsx
```

## Chạy backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend mặc định chạy ở: `http://127.0.0.1:8000`

Swagger docs: `http://127.0.0.1:8000/docs`

## Chạy frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend mặc định chạy ở: `http://127.0.0.1:5173`

## Tài khoản demo


- `admin@buildinga.demo` / `123456`
- `operator@buildinga.demo` / `123456`
- `admin@buildingb.demo` / `123456`

## API chính

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /dashboard/summary`
- `GET /sensors/mq2`
- `GET /sensors/temperature`
- `GET /sensors/readings/live`
- `POST /device-readings/ingest`
- `GET /floors`
- `GET /floors/{floorId}/plan`
- `PUT /floors/{floorId}/plan`

## MVP hiện có

- Multi-tenant theo `building_id`
- JWT auth + seed demo users/buildings
- Dashboard sensor MQ2 / nhiệt có filter tầng, search, realtime qua WebSocket + simulator
- Editor canvas có zoom, pan, drag, select, multi-select kéo vùng, duplicate, copy/paste, delete, undo/redo, save/load JSON, context menu, property panel

## Gợi ý mở rộng tiếp theo

- map sensor thật vào object trên sơ đồ
- cảnh báo realtime / notification / siren workflow
- polygon room, connector, arrow, LED routing
- MQTT bridge cho ESP32 thật
- PostgreSQL + Alembic + RBAC chi tiết hơn
