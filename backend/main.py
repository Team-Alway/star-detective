"""
Star Detective Academy — FastAPI Backend (`main.py`)
2026 NASA Space Apps Challenge: "Planet X and SPHEREx"

Key Features:
- Serves Stage 4 (Training / Quick Spotter) with prepared SPHEREx/WISE examples and honest 'Training (Known Answer)' titles.
- Serves Stage 5 (Explore / Viewer) for comparing multi-epoch infrared sky patches freely via Blink, Swipe, or Difference.
- Dual-Vision Mode (`vision_mode=gamified` vs `vision_mode=raw`) on every image endpoint.
- Mandatory Observation Date (`date_obs`) and `Real` / `Simulated` (`data_tag`) metadata on every patch and HTTP response header.
- Built-in `/api/v1/academy/stages` endpoint in case the frontend team wants API-driven lesson cards in addition to `content/academy.ts`.
"""
import math
import uuid
from typing import List, Optional, Literal
import numpy as np
from fastapi import FastAPI, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from schemas import (
    AcademyStageSchema,
    PatchSummary,
    PatchDetail,
    EpochMetadata,
    FitsTelemetry,
    AnomalyCoordinates,
    DiscoveryRevealCard,
    SpotCheckRequest,
    SpotCheckResponse,
    CandidateSubmissionRequest,
    CandidateSubmissionResponse,
)
from catalog import (
    ACADEMY_STAGES,
    PATCH_CATALOG,
    DEFAULT_BANDS,
    deg_to_hms,
    deg_to_dms,
    compute_aitoff,
)
from fits_engine import load_patch_epochs, render_dual_vision_png

app = FastAPI(
    title="Star Detective Academy API",
    version="1.0.0",
    description=(
        "Backend API for **Star Detective Academy** (2026 NASA Space Apps Challenge: *Planet X and SPHEREx*).\n\n"
        "### Architecture Overview\n"
        "- **Stages 1–3 (Academy Onboarding):** Static frontend cards (`content/academy.ts`) + optional `GET /api/v1/academy/stages` endpoint.\n"
        "- **Stage 4 (Training / Quick Spotter):** Prepared SPHEREx & WISE infrared sky patches with known moving or variable objects (`stage=4`). Supports click verification and Discovery Unlocked reveal cards.\n"
        "- **Stage 5 (Explore / Viewer):** Multi-epoch comparison via Blink, Swipe, or Difference maps (`stage=5`), Dual-Vision toggle (`gamified` vs `raw`), and citizen-science candidate logging (`POST /api/v1/candidates`).\n"
        "- **Mandatory Metadata:** Every patch and rendered image includes its observation date (`YYYY-MM-DD`) and authenticity badge (`Real` or `Simulated`)."
    ),
    contact={
        "name": "Star Detective Backend Team",
    },
)

import os
_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"] + [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()
]
from auth import router as auth_router
app.include_router(auth_router)
from sky import router as sky_router
app.include_router(sky_router)

# CORS (explicit origins, credentials for session cookie) so local React/Vite/Next.js dev servers and deployed frontends connect cleanly
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Observation-Date", "X-Data-Tag", "X-Stage-Label", "X-Vision-Mode"],
)

# In-memory store for Stage 5 candidate submissions during live demo (per spec Section 8: no heavy DB required)
CANDIDATE_LOG: List[CandidateSubmissionResponse] = []


def _build_patch_summary(patch_id: str, meta: dict) -> PatchSummary:
    aitoff_x, aitoff_y = compute_aitoff(meta["ra_deg"], meta["dec_deg"])
    epochs = [
        EpochMetadata(
            epoch_number=1,
            date_obs=meta["epoch1_date"],
            data_tag=meta["data_tag"],
            gamified_image_url=f"/api/v1/patches/{patch_id}/image/1?vision_mode=gamified",
            raw_image_url=f"/api/v1/patches/{patch_id}/image/1?vision_mode=raw",
        ),
        EpochMetadata(
            epoch_number=2,
            date_obs=meta["epoch2_date"],
            data_tag=meta["data_tag"],
            gamified_image_url=f"/api/v1/patches/{patch_id}/image/2?vision_mode=gamified",
            raw_image_url=f"/api/v1/patches/{patch_id}/image/2?vision_mode=raw",
        ),
    ]
    return PatchSummary(
        id=patch_id,
        title=meta["title"],
        stage=meta["stage"],
        stage_label=meta["stage_label"],
        is_training=meta["is_training"],
        data_tag=meta["data_tag"],
        ra_deg=meta["ra_deg"],
        dec_deg=meta["dec_deg"],
        ra_hms=deg_to_hms(meta["ra_deg"]),
        dec_dms=deg_to_dms(meta["dec_deg"]),
        aitoff_x=aitoff_x,
        aitoff_y=aitoff_y,
        instrument=meta["instrument"],
        default_band=meta["default_band"],
        available_bands=DEFAULT_BANDS,
        briefing=meta["briefing"],
        epochs=epochs,
        difference_gamified_url=f"/api/v1/patches/{patch_id}/difference?vision_mode=gamified",
        difference_raw_url=f"/api/v1/patches/{patch_id}/difference?vision_mode=raw",
    )


@app.get(
    "/api/v1/health",
    tags=["System"],
    summary="Health check & FITS cache status",
)
def health_check():
    """Returns API status, loaded sky patches count, and supported stages."""
    return {
        "status": "ok",
        "service": "Star Detective API",
        "cached_patches_count": len(PATCH_CATALOG),
        "stage_4_training_patches": [k for k, v in PATCH_CATALOG.items() if v["stage"] == 4],
        "stage_5_explore_patches": [k for k, v in PATCH_CATALOG.items() if v["stage"] == 5],
        "dual_vision_modes": ["gamified", "raw"],
    }


@app.get(
    "/api/v1/academy/stages",
    response_model=List[AcademyStageSchema],
    tags=["Academy (Stages 1-5)"],
    summary="Get all 5 Star Detective Academy stages, lesson cards, and quiz questions",
)
def get_academy_stages():
    """
    Returns the complete 5-stage curriculum (Baby Steps, Known Findings, The Solar System, Training, Explore)
    including the ready-to-paste lesson cards and 3-option checkpoint questions (+20 XP each).
    """
    return ACADEMY_STAGES


@app.get(
    "/api/v1/patches",
    response_model=List[PatchSummary],
    tags=["Sky Patches (Stages 4 & 5)"],
    summary="List sky patches for Stage 4 (Training) and Stage 5 (Explore)",
)
def list_patches(
    stage: Optional[int] = Query(
        None,
        ge=4,
        le=5,
        description="Filter by stage: `4` for Stage 4: Training (Quick Spotter), `5` for Stage 5: Explore (Viewer)"
    ),
    data_tag: Optional[Literal["Real", "Simulated"]] = Query(
        None,
        description="Filter by authenticity tag: `Real` or `Simulated`"
    ),
):
    """
    Lists available sky patches with RA/Dec coordinates, Aitoff all-sky map positions, observation dates,
    `Real`/`Simulated` tags, and Dual-Vision image URLs.
    """
    results: List[PatchSummary] = []
    for patch_id, meta in PATCH_CATALOG.items():
        if stage is not None and meta["stage"] != stage:
            continue
        if data_tag is not None and meta["data_tag"] != data_tag:
            continue
        results.append(_build_patch_summary(patch_id, meta))
    return results


@app.get(
    "/api/v1/patches/{patch_id}",
    response_model=PatchDetail,
    tags=["Sky Patches (Stages 4 & 5)"],
    summary="Get detailed metadata and FITS telemetry for a single sky patch",
)
def get_patch_detail(
    patch_id: str = Path(..., description="Patch ID (e.g., `wise0855`, `barnard`, `luhman16`, `rw_aur`, `epsilon_indi`, `nep_deep`)"),
    include_answer: bool = Query(
        True,
        description="Set to `true` if the frontend wants the known anomaly coordinates and reveal card immediately"
    ),
):
    """
    Returns full metadata, live FITS pixel statistics (`min_flux`, `max_flux`, `mean_flux`), observation dates,
    and optional answer/reveal details for a sky patch.
    """
    if patch_id not in PATCH_CATALOG:
        raise HTTPException(status_code=404, detail=f"Patch '{patch_id}' not found. Available: {list(PATCH_CATALOG.keys())}")

    meta = PATCH_CATALOG[patch_id]
    summary = _build_patch_summary(patch_id, meta)
    d1, h1, d2, h2 = load_patch_epochs(patch_id)

    telemetry = FitsTelemetry(
        width_px=int(d1.shape[1]),
        height_px=int(d1.shape[0]),
        bunit=str(h1.get("BUNIT", "MJy/sr")),
        epoch1_min_flux=round(float(np.min(d1)), 4),
        epoch1_max_flux=round(float(np.max(d1)), 4),
        epoch1_mean_flux=round(float(np.mean(d1)), 4),
        epoch2_min_flux=round(float(np.min(d2)), 4),
        epoch2_max_flux=round(float(np.max(d2)), 4),
        epoch2_mean_flux=round(float(np.mean(d2)), 4),
    )

    known_anomaly = AnomalyCoordinates(**meta["anomaly"]) if include_answer else None
    reveal_card = DiscoveryRevealCard(**meta["reveal"]) if include_answer else None

    return PatchDetail(
        **summary.model_dump(),
        telemetry=telemetry,
        has_planted_glitch=bool(meta.get("glitch") is not None),
        known_anomaly=known_anomaly,
        reveal_card=reveal_card,
    )


@app.get(
    "/api/v1/patches/{patch_id}/image/{epoch}",
    tags=["FITS Image Rendering & Dual-Vision"],
    summary="Render Epoch 1 or Epoch 2 FITS image as PNG (Gamified vs Raw Dual-Vision)",
    responses={
        200: {
            "content": {"image/png": {}},
            "description": "Rendered 2D sky patch PNG with X-Observation-Date and X-Data-Tag headers.",
        }
    },
)
def get_patch_epoch_image(
    patch_id: str = Path(..., description="Patch ID (e.g., `wise0855`, `barnard`)"),
    epoch: int = Path(..., ge=1, le=2, description="Epoch number (`1` = earlier baseline date, `2` = 6 months later)"),
    vision_mode: Literal["gamified", "raw"] = Query(
        "gamified",
        description="Dual-Vision toggle: `gamified` (vibrant high-contrast false-color) or `raw` (authentic monochrome infrared)"
    ),
    cmap: Optional[Literal["inferno", "plasma", "viridis", "magma", "cool", "grayscale"]] = Query(
        None,
        description="Optional explicit colormap override"
    ),
    true_pixels: bool = Query(
        False,
        description="If `true`, disables interpolation (`nearest`) so users see crisp raw telescope pixels"
    ),
):
    """
    Streams a rendered PNG directly from the underlying NASA FITS array.
    Includes `X-Observation-Date` and `X-Data-Tag` (`Real` or `Simulated`) in HTTP response headers.
    """
    if patch_id not in PATCH_CATALOG:
        raise HTTPException(status_code=404, detail=f"Patch '{patch_id}' not found.")

    meta = PATCH_CATALOG[patch_id]
    d1, h1, d2, h2 = load_patch_epochs(patch_id)
    target_data = d1 if epoch == 1 else d2
    date_obs = meta["epoch1_date"] if epoch == 1 else meta["epoch2_date"]

    png_bytes = render_dual_vision_png(
        target_data,
        vision_mode=vision_mode,
        cmap_override=cmap,
        true_pixels=true_pixels,
        is_difference=False,
    )
    headers = {
        "X-Observation-Date": date_obs,
        "X-Data-Tag": meta["data_tag"],
        "X-Stage-Label": meta["stage_label"],
        "X-Vision-Mode": vision_mode,
        "Cache-Control": "public, max-age=3600",
    }
    return Response(content=png_bytes, media_type="image/png", headers=headers)


@app.get(
    "/api/v1/patches/{patch_id}/difference",
    tags=["FITS Image Rendering & Dual-Vision"],
    summary="Render Epoch 2 minus Epoch 1 Dipole Subtraction Map as PNG",
    responses={
        200: {
            "content": {"image/png": {}},
            "description": "Rendered difference image showing moving dipoles (dark at Epoch 1, bright at Epoch 2).",
        }
    },
)
def get_patch_difference_image(
    patch_id: str = Path(..., description="Patch ID (e.g., `wise0855`, `barnard`)"),
    vision_mode: Literal["gamified", "raw"] = Query(
        "gamified",
        description="`gamified` renders a diverging blue-red dipole map; `raw` renders linear diverging grayscale"
    ),
    true_pixels: bool = Query(False, description="If `true`, renders crisp detector pixels (`nearest`)"),
):
    """
    Computes `Epoch 2 - Epoch 1` directly from the FITS arrays. Fixed background stars cancel out to neutral gray,
    while moving objects leave a clear dipole signature.
    """
    if patch_id not in PATCH_CATALOG:
        raise HTTPException(status_code=404, detail=f"Patch '{patch_id}' not found.")

    meta = PATCH_CATALOG[patch_id]
    d1, _, d2, _ = load_patch_epochs(patch_id)
    diff_data = d2 - d1

    png_bytes = render_dual_vision_png(
        diff_data,
        vision_mode=vision_mode,
        true_pixels=true_pixels,
        is_difference=True,
    )
    headers = {
        "X-Observation-Date": f"{meta['epoch1_date']} vs {meta['epoch2_date']}",
        "X-Data-Tag": meta["data_tag"],
        "X-Stage-Label": meta["stage_label"],
        "X-Vision-Mode": vision_mode,
    }
    return Response(content=png_bytes, media_type="image/png", headers=headers)


@app.post(
    "/api/v1/patches/{patch_id}/verify",
    response_model=SpotCheckResponse,
    tags=["Stage 4: Training (Quick Spotter)"],
    summary="Verify user click in Stage 4 (Training) and unlock the Discovery Reveal Card",
)
def verify_training_spot(
    payload: SpotCheckRequest,
    patch_id: str = Path(..., description="Patch ID being played in Stage 4: Training"),
):
    """
    Validates whether the learner clicked on the moving/variable object in a prepared training patch.
    - Supports both raw `0..128` pixel coordinates and `0.0..1.0` normalized coordinates (`normalized=true`).
    - Detects if the learner accidentally clicked a single-frame cosmic ray glitch and gives helpful feedback.
    - Always returns the true coordinates and `reveal_card` so the UI can highlight the answer.
    """
    if patch_id not in PATCH_CATALOG:
        raise HTTPException(status_code=404, detail=f"Patch '{patch_id}' not found.")

    meta = PATCH_CATALOG[patch_id]
    gx = payload.click_x * 128.0 if payload.normalized else payload.click_x
    gy = payload.click_y * 128.0 if payload.normalized else payload.click_y

    anom = meta["anomaly"]
    dist1 = math.hypot(gx - anom["epoch1_x"], gy - anom["epoch1_y"])
    dist2 = math.hypot(gx - anom["epoch2_x"], gy - anom["epoch2_y"])
    min_dist = min(dist1, dist2)
    tol = anom["tolerance_radius_px"]

    # Check if they clicked the planted single-frame camera glitch
    hit_glitch = False
    if meta.get("glitch"):
        gl = meta["glitch"]
        if math.hypot(gx - gl["x"], gy - gl["y"]) <= gl["radius"]:
            hit_glitch = True

    correct = (min_dist <= tol) and not hit_glitch
    xp_awarded = 50 if correct else 0

    if correct:
        feedback = f"Spot on! You found {meta['reveal']['object_name']}. {meta['reveal']['blink_explanation']}"
    elif hit_glitch:
        feedback = (
            "Careful—that bright spike at (30, 95) only appears in Epoch 1 and vanishes completely in Epoch 2! "
            "That is a single-frame camera glitch (cosmic ray hit). Look for the dot that shifts between BOTH images."
        )
    else:
        feedback = (
            f"Not quite (you clicked {min_dist:.1f} px away). Flip back and forth between Epoch 1 and Epoch 2 "
            f"and look for the source jumping from ({anom['epoch1_x']:.0f}, {anom['epoch1_y']:.0f}) to ({anom['epoch2_x']:.0f}, {anom['epoch2_y']:.0f})."
        )

    return SpotCheckResponse(
        patch_id=patch_id,
        correct=correct,
        hit_glitch=hit_glitch,
        click_grid_x=round(gx, 2),
        click_grid_y=round(gy, 2),
        distance_to_target_px=round(min_dist, 2),
        xp_awarded=xp_awarded,
        feedback=feedback,
        target_coords=AnomalyCoordinates(**anom),
        reveal_card=DiscoveryRevealCard(**meta["reveal"]),
    )


@app.post(
    "/api/v1/candidates",
    response_model=CandidateSubmissionResponse,
    tags=["Stage 5: Explore (Citizen Science Viewer)"],
    summary="Log a potential moving candidate noticed in Stage 5: Explore",
)
def submit_explore_candidate(payload: CandidateSubmissionRequest):
    """
    Logs a citizen-science observation in **Stage 5: Explore**.
    Per project rules, anything noticed in Stage 5 is recorded honestly as a **candidate** (never claimed as a confirmed new planet)
    and automatically checked against single-frame sensor glitches.
    """
    if payload.patch_id not in PATCH_CATALOG:
        raise HTTPException(status_code=404, detail=f"Patch '{payload.patch_id}' not found.")

    meta = PATCH_CATALOG[payload.patch_id]
    gx = payload.click_x * 128.0 if payload.normalized else payload.click_x
    gy = payload.click_y * 128.0 if payload.normalized else payload.click_y

    # Convert pixel offset from center (64, 64) to approximate sky RA/Dec (~6.2 arcsec/pixel SPHEREx scale)
    pixel_scale_deg = 6.2 / 3600.0
    est_ra = round(meta["ra_deg"] + (gx - 64.0) * pixel_scale_deg, 5)
    est_dec = round(meta["dec_deg"] + (gy - 64.0) * pixel_scale_deg, 5)

    # Automated glitch check: did they click on a known single-frame cosmic ray spike?
    likely_glitch = False
    if meta.get("glitch"):
        gl = meta["glitch"]
        if math.hypot(gx - gl["x"], gy - gl["y"]) <= gl["radius"]:
            likely_glitch = True

    if likely_glitch:
        msg = (
            "Automated Triage Note: This spike appears in only one date and is sharper than surrounding stars, "
            "so it is likely a camera sensor glitch rather than a moving solar system body."
        )
        xp = 10
    else:
        msg = (
            "Candidate logged! Software and people working together: your coordinates have been recorded as an "
            "unconfirmed candidate for multi-epoch follow-up."
        )
        xp = 30

    record = CandidateSubmissionResponse(
        candidate_id=f"CAND-{uuid.uuid4().hex[:8].upper()}",
        patch_id=payload.patch_id,
        stage_label="Stage 5: Explore",
        estimated_ra_deg=est_ra,
        estimated_dec_deg=est_dec,
        grid_x=round(gx, 2),
        grid_y=round(gy, 2),
        epoch1_date=meta["epoch1_date"],
        epoch2_date=meta["epoch2_date"],
        data_tag=meta["data_tag"],
        likely_single_frame_glitch=likely_glitch,
        triage_message=msg,
        xp_awarded=xp,
    )
    CANDIDATE_LOG.append(record)
    return record


@app.get(
    "/api/v1/candidates",
    response_model=List[CandidateSubmissionResponse],
    tags=["Stage 5: Explore (Citizen Science Viewer)"],
    summary="List candidates logged during the current session",
)
def list_submitted_candidates():
    """Returns all Stage 5 candidates flagged by users during the session."""
    return CANDIDATE_LOG
