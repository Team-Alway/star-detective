/** Types mirror backend/schemas.py (FastAPI, OpenAPI 3.1). */

export type DataTag = "Real" | "Simulated";

export type EpochMetadata = {
  epoch_number: 1 | 2;
  date_obs: string;
  data_tag: DataTag;
  gamified_image_url: string;
  raw_image_url: string;
};

export type PatchSummary = {
  id: string;
  title: string;
  stage: 4 | 5;
  stage_label: string;
  is_training: boolean;
  data_tag: DataTag;
  ra_deg: number;
  dec_deg: number;
  ra_hms: string;
  dec_dms: string;
  instrument: string;
  default_band: string;
  briefing: string;
  epochs: EpochMetadata[];
  difference_gamified_url: string;
  difference_raw_url: string;
};

export type AnomalyCoordinates = {
  epoch1_x: number;
  epoch1_y: number;
  epoch2_x: number;
  epoch2_y: number;
  tolerance_radius_px: number;
};

export type DiscoveryRevealCard = {
  object_name: string;
  discovery_year: number;
  discoverer: string;
  anomaly_type: string;
  story: string;
  blink_explanation: string;
};

export type PatchDetail = PatchSummary & {
  has_planted_glitch: boolean;
  known_anomaly: AnomalyCoordinates | null;
  reveal_card: DiscoveryRevealCard | null;
};
