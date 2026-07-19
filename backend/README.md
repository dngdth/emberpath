# Backend - Building Safety MVP

## Run

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

## Routing topology

`app/services/gradient_field.py` chứa bộ định tuyến Gradient Field độc lập.
`app/services/pathfinding.py` chuyển toàn bộ floor plan của một tòa nhà thành
topology đa tầng. Chỉ `led_wire` có hai đầu hợp lệ tạo liên kết cùng tầng;
cầu thang cùng tên và `target_floor_id` tạo liên kết liên tầng. Bộ định tuyến
tạo trường chỉ dẫn trên mọi tầng liên kết, ưu tiên exit và dùng node xa đám
cháy nhất làm đích dự phòng khi một thành phần không có exit. Dây kề node
`danger` được trả về màu đỏ với chiều hướng ra khỏi node cháy; mọi dây hợp lệ
còn lại đều được trả về màu xanh. Endpoint `PUT /floors/plans/bulk` lưu đầy đủ
các tầng của tòa nhà trong cùng một transaction.

Chạy test:

```bash
python -m unittest discover -s tests -v
```

API docs: `http://127.0.0.1:8000/docs`

## Demo accounts

- `admin@buildinga.demo` / `123456`
- `operator@buildinga.demo` / `123456`
- `admin@buildingb.demo` / `123456`
