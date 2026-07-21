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
- `superadmin@emberpath.demo` / `123456` (CRM và quản trị khách hàng)

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
- `POST /leads` (form tư vấn công khai)
- `GET /admin/leads`
- `PATCH /admin/leads/{leadId}/status`
- `GET /admin/buildings`
- `POST /admin/buildings/{buildingId}/impersonate`
- `POST /admin/users/{userId}/reset-password`
- `GET /admin/audit-logs`

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

## Gradient Field routing

Emberpath dùng thuật toán Gradient Field đã tích hợp từ dự án EscapeMesh. Mỗi
lối thoát quảng bá cost `0`; các node còn lại nhận `min(neighbor_cost) + 1` qua
từng nhịp cho tới khi hội tụ. Tuyến thoát hiểm luôn đi theo cost giảm dần.

- Chỉ object `led_wire` nối đúng hai node mới tạo cạnh trên đồ thị.
- `connector` cũ và dây LED hở đầu không được dùng để suy đoán đường đi.
- Node có trạng thái `danger` được tách khỏi topology an toàn; mọi dây LED sát
  node cháy chuyển đỏ và có mũi tên hướng ra xa node đó.
- Cầu thang cùng tên dùng `target_floor_id` để tạo liên kết giữa các tầng.
- Khi kích hoạt, Gradient Field tạo chỉ dẫn cho toàn bộ các tầng đang liên kết.
- Mỗi vùng ưu tiên đi tới lối thoát; vùng không có lối thoát sẽ hướng tới node
  xa đám cháy nhất có thể.
- Khi kích hoạt, toàn bộ dây LED hợp lệ đều được phân loại: dây chạm node
  `danger` màu đỏ, tất cả dây còn lại màu xanh; không còn dây màu mặc định.
- Dây có mũi tên và bám vào node khi node di chuyển.
- Nút **Lưu sơ đồ** lưu bản nháp của toàn bộ tầng trong một giao dịch cấp tòa nhà.

Tài khoản xem seed demo 4 tầng:

- `gradient@emberpath.demo` / `123456`

API `GET /floors/{floorId}/path?start_node_id=...` trả về node, đoạn dây LED,
số hop và số vòng hội tụ của Gradient Field. Có thể truyền thêm
`end_node_id` khi cần tìm tới một node cụ thể trong trình chỉnh sửa.
