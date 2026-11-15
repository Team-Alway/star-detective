"""
Pydantic Schemas for Star Detective Academy API.
Provides strict type validation and rich OpenAPI 3.1 documentation for the Frontend Team.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class LessonCardSchema(BaseModel):
    title: str = Field(..., description="Card heading (e.g., 'Infrared light', 'Pluto, 1930')")
    text: str = Field(..., description="2 to 3 sentences explaining the concept in plain language")
    icon_name: str = Field(..., description="Suggested icon identifier for frontend UI")


class StageQuestionSchema(BaseModel):
    question: str = Field(..., description="Multiple-choice checkpoint question for the stage")
    options: List[str] = Field(..., min_length=3, max_length=3, description="Exactly 3 answer options")
    correct_index: int = Field(..., ge=0, le=2, description="0-based index of the correct option")
    feedback: str = Field(..., description="Explanation shown after answering (or when retrying)")
    xp_reward: int = Field(default=20, description="XP awarded for a correct answer (+20 XP per spec)")


class AcademyStageSchema(BaseModel):
    stage_number: int = Field(..., ge=1, le=5, description="Stage number (1 to 5)")
    name: str = Field(..., description="Stage name (e.g., 'Baby Steps', 'Training', 'Explore')")
    subtitle: str = Field(..., description="One-line description of what the learner does")
    stage_type: Literal["lesson", "training", "explore"] = Field(..., description="UI mode for this stage")
    cards: List[LessonCardSchema] = Field(default_factory=list, description="Lesson cards (Stages 1-3)")
    question: Optional[StageQuestionSchema] = Field(None, description="Unlock quiz question (Stages 1-3)")


class AnomalyCoordinates(BaseModel):
    epoch1_x: float = Field(..., description="X pixel coordinate (0-128) in Epoch 1")
    epoch1_y: float = Field(..., description="Y pixel coordinate (0-128) in Epoch 1")
    epoch2_x: float = Field(..., description="X pixel coordinate (0-128) in Epoch 2")
    epoch2_y: float = Field(..., description="Y pixel coordinate (0-128) in Epoch 2")
    tolerance_radius_px: float = Field(default=12.0, description="Click tolerance radius in pixels (on 128x128 grid)")


class DiscoveryRevealCard(BaseModel):
    object_name: str = Field(..., description="Official astronomical name of the target")
    discovery_year: int = Field(..., description="Year the object or behavior was discovered")
    discoverer: str = Field(..., description="Astronomer or mission team credited")
    anomaly_type: str = Field(..., description="Category (e.g., 'High Proper Motion Brown Dwarf', 'Variable Star')")
    story: str = Field(..., description="2-3 sentence backstory unlocked upon spotting the anomaly")
    blink_explanation: str = Field(..., description="Plain-English explanation of what moved or changed between Epoch 1 and Epoch 2")


class EpochMetadata(BaseModel):
    epoch_number: Literal[1, 2] = Field(..., description="Epoch index (1 = earlier baseline, 2 = 6 months later)")
    date_obs: str = Field(..., description="Observation UTC date (YYYY-MM-DD) - MUST be displayed on every image")
    data_tag: Literal["Real", "Simulated"] = Field(..., description="Mandatory authenticity badge ('Real' or 'Simulated')")
    gamified_image_url: str = Field(..., description="URL for Dual-Vision Gamified (false-color enhanced) PNG")
    raw_image_url: str = Field(..., description="URL for Dual-Vision Authentic Raw (monochrome grayscale) PNG")


class PatchSummary(BaseModel):
    id: str = Field(..., description="Unique patch identifier (e.g., 'wise0855', 'barnard', 'nep_deep')")
    title: str = Field(..., description="Display title (explicitly marked as Training/Known Answer for Stage 4)")
    stage: Literal[4, 5] = Field(..., description="4 = Stage 4: Training (Quick Spotter), 5 = Stage 5: Explore (Viewer)")
    stage_label: str = Field(..., description="'Stage 4: Training' or 'Stage 5: Explore'")
    is_training: bool = Field(..., description="True if prepared training example with known answer (Stage 4)")
    data_tag: Literal["Real", "Simulated"] = Field(..., description="Mandatory 'Real' or 'Simulated' badge")
    ra_deg: float = Field(..., description="Right Ascension in decimal degrees (J2000)")
    dec_deg: float = Field(..., description="Declination in decimal degrees (J2000)")
    ra_hms: str = Field(..., description="Right Ascension in sexagesimal format (HHh MMm SSs)")
    dec_dms: str = Field(..., description="Declination in sexagesimal format (+DD° MM' SS\")")
    aitoff_x: float = Field(..., description="Normalized Aitoff projection X coordinate (-1.0 to 1.0) for all-sky map")
    aitoff_y: float = Field(..., description="Normalized Aitoff projection Y coordinate (-1.0 to 1.0) for all-sky map")
    instrument: str = Field(..., description="Telescope/mission source (e.g., 'SPHEREx', 'SPHEREx / WISE-Archive')")
    default_band: str = Field(..., description="Default near-infrared spectral band")
    available_bands: List[str] = Field(..., description="Selectable infrared bands for spectral exploration")
    briefing: str = Field(..., description="Short 2-sentence mission briefing for the user")
    epochs: List[EpochMetadata] = Field(..., description="Metadata and image URLs for Epoch 1 and Epoch 2")
    difference_gamified_url: str = Field(..., description="URL for Epoch 2 - Epoch 1 difference map (Gamified color)")
    difference_raw_url: str = Field(..., description="URL for Epoch 2 - Epoch 1 difference map (Raw grayscale)")


class FitsTelemetry(BaseModel):
    width_px: int = Field(default=128, description="FITS cutout width in detector pixels")
    height_px: int = Field(default=128, description="FITS cutout height in detector pixels")
    bunit: str = Field(default="MJy/sr", description="Physical surface brightness unit from FITS header")
    epoch1_min_flux: float = Field(..., description="Minimum pixel value in Epoch 1")
    epoch1_max_flux: float = Field(..., description="Maximum pixel value in Epoch 1")
    epoch1_mean_flux: float = Field(..., description="Mean background flux in Epoch 1")
    epoch2_min_flux: float = Field(..., description="Minimum pixel value in Epoch 2")
    epoch2_max_flux: float = Field(..., description="Maximum pixel value in Epoch 2")
    epoch2_mean_flux: float = Field(..., description="Mean background flux in Epoch 2")


class PatchDetail(PatchSummary):
    telemetry: FitsTelemetry = Field(..., description="Real-time statistics extracted from the FITS primary HDU")
    has_planted_glitch: bool = Field(..., description="Whether this patch contains a single-frame sensor glitch to test the user")
    known_anomaly: Optional[AnomalyCoordinates] = Field(
        None,
        description="Coordinates of the known moving/varying object (populated for Stage 4 when include_answer=true)"
    )
    reveal_card: Optional[DiscoveryRevealCard] = Field(
        None,
        description="Historical story and scientific explanation (populated for Stage 4 when include_answer=true)"
    )


class SpotCheckRequest(BaseModel):
    click_x: float = Field(..., description="User click X coordinate (0-128 pixel grid, or 0.0-1.0 if normalized=True)")
    click_y: float = Field(..., description="User click Y coordinate (0-128 pixel grid, or 0.0-1.0 if normalized=True)")
    normalized: bool = Field(
        default=False,
        description="Set to True if frontend sends normalized (0.0 to 1.0) coordinates relative to image width/height"
    )


class SpotCheckResponse(BaseModel):
    patch_id: str
    correct: bool = Field(..., description="True if the user clicked within the tolerance radius of the moving anomaly")
    hit_glitch: bool = Field(..., description="True if the user was fooled by a single-frame cosmic ray / camera glitch")
    click_grid_x: float = Field(..., description="Click X converted to the 128x128 FITS pixel grid")
    click_grid_y: float = Field(..., description="Click Y converted to the 128x128 FITS pixel grid")
    distance_to_target_px: float = Field(..., description="Euclidean distance in pixels from click to the true target")
    xp_awarded: int = Field(..., description="XP earned (+50 XP on correct spot, 0 on miss)")
    feedback: str = Field(..., description="Immediate encouraging feedback or glitch warning")
    target_coords: AnomalyCoordinates = Field(..., description="True coordinates so frontend can draw the reveal ring")
    reveal_card: DiscoveryRevealCard = Field(..., description="Discovery Unlocked card details")


class CandidateSubmissionRequest(BaseModel):
    patch_id: str = Field(..., description="ID of the patch being inspected in Stage 5: Explore")
    click_x: float = Field(..., description="Candidate X coordinate (0-128 or 0.0-1.0 if normalized=True)")
    click_y: float = Field(..., description="Candidate Y coordinate (0-128 or 0.0-1.0 if normalized=True)")
    normalized: bool = Field(default=False, description="True if click_x/click_y are normalized (0.0 to 1.0)")
    classification: Literal["slow_mover", "fast_mover", "variable_brightness", "dipole_shift", "unsure"] = Field(
        default="dipole_shift",
        description="User's hypothesis for what changed between the two dates"
    )
    user_notes: Optional[str] = Field(default="", max_length=500, description="Optional observation note from the citizen scientist")


class CandidateSubmissionResponse(BaseModel):
    candidate_id: str = Field(..., description="Unique tracking ID for the logged candidate")
    patch_id: str
    stage_label: str = Field(default="Stage 5: Explore")
    estimated_ra_deg: float = Field(..., description="Calculated Right Ascension (deg) of the clicked pixel")
    estimated_dec_deg: float = Field(..., description="Calculated Declination (deg) of the clicked pixel")
    grid_x: float
    grid_y: float
    epoch1_date: str
    epoch2_date: str
    data_tag: Literal["Real", "Simulated"]
    likely_single_frame_glitch: bool = Field(
        ...,
        description="Automated software check: True if flux spike appears in only 1 epoch with sharp 1-px profile"
    )
    triage_message: str = Field(
        ...,
        description="Honest scientific feedback reminding the user that Stage 5 logs are candidates, not confirmed planets"
    )
    xp_awarded: int = Field(default=30, description="XP awarded for logging a carefully inspected candidate")
