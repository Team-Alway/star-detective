# Star Detective Academy — Backend

**2026 NASA Space Apps Challenge: "Planet X and SPHEREx"**

## What's Inside This Bundle

```text
star_detective_backend/
├── main.py                  # FastAPI server (Stages 4 & 5, Dual-Vision, FITS rendering, Candidate Triage)
├── schemas.py               # Pydantic v2 models for clean OpenAPI 3.1 documentation
├── catalog.py               # Registry of Stage 4 (Training) & Stage 5 (Explore) sky patches + Stage 1-3 cards
├── fits_engine.py           # Astropy FITS loader (with pure-NumPy fallback) & Dual-Vision PNG renderer
├── fetch_real_nasa.py       # NASA IRSA cache verifier & HTTP 503 retry downloader
├── export_openapi.py        # Exports live FastAPI OpenAPI 3.1 schema to openapi.json
├── openapi.json             # Ready-to-share OpenAPI 3.1 specification for the Frontend Team
├── requirements.txt         # Python dependencies
├── setup_and_run.ps1        # One-command PowerShell launcher
├── frontend_handoff/
│   └── academy.ts           # Ready-to-paste TypeScript file for Stages 1-3 + localStorage XP/stage logic
└── fits_cache/              # Pre-seeded with 12 standard NASA FITS cutouts (Epoch 1 & Epoch 2 for 6 patches)
```

## Quick Start (PowerShell / Anaconda)

```powershell
cd star_detective_backend
pip install -r requirements.txt
.\setup_and_run.ps1
```

Or run manually:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Key URLs for the Frontend Team
- **Swagger UI (Interactive Docs):** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`
- **Raw OpenAPI Spec:** `http://localhost:8000/openapi.json` (also saved directly as `openapi.json`)

## How This Backend Meets Every Spec Requirement
1. **Stage 4 (Training / Quick Spotter) works out-of-the-box:** `GET /api/v1/patches?stage=4` serves 4 prepared patches (`wise0855`, `barnard`, `luhman16`, `rw_aur`) explicitly marked with `Training (Known Answer)` in their titles.
2. **Blink, Answer, Reveal:** `POST /api/v1/patches/{patch_id}/verify` validates user clicks (accepts either `0..128` pixel coords or `0.0..1.0` normalized mobile coords), detects if they clicked a single-frame cosmic ray glitch, awards XP, and returns the `DiscoveryRevealCard`.
3. **Stage 5 (Explore / Viewer):** `GET /api/v1/patches?stage=5` serves exploration patches (`epsilon_indi`, `nep_deep`) and `POST /api/v1/candidates` logs unconfirmed candidates honestly.
4. **Dual-Vision Toggle:** Every image endpoint (`/image/1`, `/image/2`, `/difference`) accepts `?vision_mode=gamified` (vibrant false-color) or `?vision_mode=raw` (authentic monochrome grayscale).
5. **Mandatory Dates & Authenticity Tags:** Every patch JSON and every rendered image header carries `date_obs` (`X-Observation-Date`) and `data_tag` (`X-Data-Tag`: `Real` or `Simulated`).
