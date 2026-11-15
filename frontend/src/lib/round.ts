import { absoluteUrl, fetchPatch, fetchPatches } from "@/lib/api";
import {
  SOURCE_URL,
  buildEntry,
  formatDelta,
  scoreAnswer,
  type Answer,
  type PatchKind,
  type RoundEntry,
  type Tone,
} from "@/lib/demo";
import type { DataTag, PatchDetail } from "@/lib/types";

const SAVED_IMAGE = "/figma/spherex-detector.jpeg";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-05-12" → "12 May 2025" */
export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export type Point = { x: number; y: number };

/** Two images of one patch: either from the API or the bundled "saved level". */
export type ImageSet = {
  mode: "api" | "saved";
  srcA: string;
  srcB: string;
  dateA: string;
  dateB: string;
  tag?: DataTag;
};

export type PatchReveal = {
  name: string;
  type: string;
  year: number;
  discoverer: string;
  story: string;
  explanation: string;
  instrument: string;
  band: string;
};

export type RoundPatch = {
  id: string;
  kind: PatchKind;
  label: string;
  images: ImageSet;
  /** Positions of the anomaly in epoch A and B, in the 608 px design frame. */
  positions: { a: Point; b: Point };
  /** Present for API patches; saved levels use the simulated demo copy. */
  reveal?: PatchReveal;
};

const GRID = 128;
const FRAME = 608;
const toFrame = (value: number) => (value / GRID) * FRAME;

/** Convert an API patch (with answer) into a playable round patch. */
export function toRoundPatch(detail: PatchDetail): RoundPatch {
  const [first, second] = detail.epochs;
  const anomaly = detail.known_anomaly;
  const card = detail.reveal_card;
  const shift = anomaly
    ? Math.hypot(anomaly.epoch2_x - anomaly.epoch1_x, anomaly.epoch2_y - anomaly.epoch1_y)
    : 0;
  const moved = anomaly ? shift > anomaly.tolerance_radius_px : false;

  return {
    id: detail.id,
    kind: moved ? "mover" : "none",
    label: moved ? "Mover" : "Variable",
    images: {
      mode: "api",
      srcA: absoluteUrl(first.gamified_image_url),
      srcB: absoluteUrl(second.gamified_image_url),
      dateA: first.date_obs,
      dateB: second.date_obs,
      tag: detail.data_tag,
    },
    positions: anomaly
      ? {
          a: { x: toFrame(anomaly.epoch1_x), y: toFrame(anomaly.epoch1_y) },
          b: { x: toFrame(anomaly.epoch2_x), y: toFrame(anomaly.epoch2_y) },
        }
      : { a: { x: 244, y: 300 }, b: { x: 334, y: 300 } },
    reveal: card
      ? {
          name: card.object_name,
          type: card.anomaly_type,
          year: card.discovery_year,
          discoverer: card.discoverer,
          story: card.story,
          explanation: card.blink_explanation,
          instrument: detail.instrument,
          band: detail.default_band,
        }
      : undefined,
  };
}

/** Stage 4 (Training) patches with their answers, from the backend. */
export async function loadRound(): Promise<RoundPatch[]> {
  const summaries = await fetchPatches(4);
  const details = await Promise.all(summaries.map((patch) => fetchPatch(patch.id)));
  return details.map(toRoundPatch);
}

const SAVED_IMAGES: ImageSet = {
  mode: "saved",
  srcA: SAVED_IMAGE,
  srcB: SAVED_IMAGE,
  dateA: "2025-03-27",
  dateB: "2025-03-27",
};
const SAVED_POSITIONS = { a: { x: 244, y: 300 }, b: { x: 334, y: 300 } };

/** Bundled four-patch round (one SPHEREx reference image, simulated motion). Used when the API is unreachable. */
export const SAVED_ROUND: RoundPatch[] = [
  { id: "patch-01", kind: "mover", label: "Mover" },
  { id: "patch-02", kind: "glitch", label: "Glitch" },
  { id: "patch-03", kind: "glitch", label: "Glitch" },
  { id: "patch-04", kind: "none", label: "No change" },
].map((patch) => ({
  ...patch,
  kind: patch.kind as PatchKind,
  images: SAVED_IMAGES,
  positions: SAVED_POSITIONS,
}));

const SAMPLE_ANSWERS: Answer[] = ["moved", "still", "moved", "still"];

export const SAMPLE_RESULTS: RoundEntry[] = SAVED_ROUND.map((patch, index) =>
  buildEntry(patch, SAMPLE_ANSWERS[index]),
);

export type Outcome = {
  title: string;
  tone: Tone;
  xpLabel: string;
  chose: string;
  badge: string;
  badgeTone: "simulated" | "candidate" | "muted";
  cardName: string;
  cardDescription: string;
  cardDates: string;
  cardNote: string;
  cardLink?: { label: string; href: string };
  how: string;
  marker: "found" | "missed" | "glitch-good" | "glitch-fooled" | "static" | "none";
  markerLabel?: string;
};

export function describeOutcome(patch: RoundPatch, answer: Answer): Outcome {
  const { correct, delta } = scoreAnswer(patch.kind, answer);
  const xpLabel = patch.kind === "mover" && !correct ? "0 XP · no penalty" : formatDelta(delta);
  const chose =
    answer === "moved"
      ? "You chose “I see movement”."
      : "You chose “Nothing moving”.";
  const tone: Tone = patch.kind === "mover" && !correct ? "neutral" : correct ? "correct" : "wrong";

  if (patch.reveal) {
    const r = patch.reveal;
    const moved = patch.kind === "mover";
    return {
      title: moved
        ? correct ? "You found it" : "It was here"
        : correct ? "Good eye" : "It stayed put",
      tone,
      xpLabel,
      chose,
      badge: `${patch.images.tag ?? "Real"} data`,
      badgeTone: "muted",
      cardName: r.name,
      cardDescription: `${r.type} · discovered ${r.year} by ${r.discoverer}`,
      cardDates: `${formatDate(patch.images.dateA)} · ${formatDate(patch.images.dateB)}`,
      cardNote: r.story,
      cardLink: undefined,
      how: moved
        ? r.explanation
        : `${correct ? "Good eye. " : ""}${r.explanation}`,
      marker: moved ? (correct ? "found" : "missed") : "static",
      markerLabel: "BRIGHTNESS CHANGE / NOT MOVEMENT",
    };
  }

  const link = { label: "NASA / JPL image source ↗", href: SOURCE_URL };
  const savedDates = "27 Mar 2025 · demo A / B";
  const note = "Movement not measured in demo";

  if (patch.kind === "mover") {
    return correct
      ? {
          title: "You found it", tone, xpLabel, chose,
          badge: "Simulated object", badgeTone: "simulated",
          cardName: "Mover example", cardDescription: "Simulated movement · design preview",
          cardDates: savedDates, cardNote: note, cardLink: link,
          how: "A moving object changes position while nearby stars stay put. Watch the ringed dot shift between A and B.",
          marker: "found",
        }
      : {
          title: "It was here", tone, xpLabel, chose,
          badge: "Simulated object", badgeTone: "simulated",
          cardName: "Mover example", cardDescription: "Simulated movement · design preview",
          cardDates: savedDates, cardNote: note, cardLink: link,
          how: "It was here. Watch the ringed dot shift. Nearby stars stay in the same place, so their positions help you compare.",
          marker: "missed",
        };
  }

  if (patch.kind === "glitch") {
    const base = {
      tone, xpLabel, chose,
      badge: "Simulated glitch", badgeTone: "simulated" as const,
      cardName: "Glitch example", cardDescription: "Simulated camera artifact · design preview",
      cardDates: savedDates, cardNote: note, cardLink: link,
    };
    return correct
      ? {
          ...base, title: "Good eye",
          how: "Good eye. Nothing real moved here. A camera artifact can appear in one image without moving across the sky.",
          marker: "glitch-good", markerLabel: "GLITCH / NOT MOVEMENT",
        }
      : {
          ...base, title: "That was a glitch",
          how: "A cosmic ray can hit the camera in one image only. A mark that appears once is not evidence of movement across the sky.",
          marker: "glitch-fooled", markerLabel: "ONE IMAGE ONLY",
        };
  }

  const base = {
    tone, xpLabel, chose,
    badge: "No change", badgeTone: "muted" as const,
    cardName: "Quiet patch", cardDescription: "Same sky in both images · design preview",
    cardDates: savedDates, cardNote: note, cardLink: link,
    marker: "none" as const,
  };
  return correct
    ? { ...base, title: "Good eye", how: "Good eye. Nothing moved between A and B, and “nothing” is a real answer." }
    : { ...base, title: "Nothing moved", how: "Nothing moved between A and B. Check that the stars stay put before calling a mover." };
}
