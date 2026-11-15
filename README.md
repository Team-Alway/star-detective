# Star Detective

Spot what moved between two infrared images of the same sky (NASA SPHEREx).

```
frontend/   Next.js app (Quick Spotter, Viewer, round summary, About)
backend/    FastAPI service that renders NASA FITS patches and checks answers
```

## Run it

**Backend** (http://localhost:8000, docs at `/docs`):

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8000
```

The first start is slow while matplotlib builds its font cache.

**Frontend** (http://localhost:3000):

```bash
cd frontend
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local   # optional, this is the default
npm install
npm run dev
```

## How they connect

| Screen | Backend calls |
|---|---|
| Quick Spotter (`/play`) | `GET /api/v1/patches?stage=4`, then `GET /api/v1/patches/{id}` for each patch (answer + reveal card). Images come from `/api/v1/patches/{id}/image/{1,2}`. |
| Viewer (`/viewer`) | `GET /api/v1/patches` (all 6), same image endpoints. |

If the backend is unreachable, both screens show the "We could not load this image" state with
**Play a saved level**, which switches to the bundled single-image preview.
