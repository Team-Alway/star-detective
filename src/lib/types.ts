export type Frame = {
  image: string;
  date: string;
  wavelength_um: number;
  source_url: string;
};

export type PatchSummary = {
  id: string;
  title: string;
  data_label: "real" | "simulated";
  thumbnail: string;
};

export type Patch = {
  id: string;
  title: string;
  data_label: "real" | "simulated";
  center: { ra: number; dec: number };
  size_deg: number;
  bandpass: string;
  frames: Frame[];
};

export type Position = {
  frame: number;
  x: number;
  y: number;
};

export type AnswerResult = {
  correct: boolean;
  xp: number;
  tier: "glitch" | "calibration" | "anomaly";
  reveal: {
    moved: boolean;
    positions: Position[];
    object?: {
      name: string;
      type: string;
      shift_arcsec?: number;
      info_url?: string;
    };
    explanation: string;
    diff_image?: string;
  };
};
