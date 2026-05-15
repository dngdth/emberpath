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

API docs: `http://127.0.0.1:8000/docs`

## Demo accounts

- `admin@buildinga.demo` / `123456`
- `operator@buildinga.demo` / `123456`
- `admin@buildingb.demo` / `123456`
