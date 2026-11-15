export const SOURCE_URL =
  "https://www.jpl.nasa.gov/images/pia26280-first-images-from-nasas-spherex/";

export type PatchKind = "mover" | "glitch" | "none";
export type Answer = "moved" | "still";
export type Tone = "correct" | "wrong" | "neutral";

export type DemoPatch = {
  id: string;
  kind: PatchKind;
  label: string;
};

/** Sample four-patch round that uses one SPHEREx reference image. */
export const DEMO_ROUND: DemoPatch[] = [
  { id: "patch-01", kind: "mover", label: "Mover" },
  { id: "patch-02", kind: "glitch", label: "Glitch" },
  { id: "patch-03", kind: "glitch", label: "Glitch" },
  { id: "patch-04", kind: "none", label: "No change" },
];

export type RoundEntry = {
  patchId: string;
  kind: PatchKind;
  label: string;
  answer: Answer;
  correct: boolean;
  delta: number;
};

export function scoreAnswer(kind: PatchKind, answer: Answer) {
  if (kind === "mover") {
    return answer === "moved"
      ? { correct: true, delta: 150 }
      : { correct: false, delta: 0 };
  }
  return answer === "still"
    ? { correct: true, delta: 100 }
    : { correct: false, delta: -25 };
}

export function buildEntry(patch: DemoPatch, answer: Answer): RoundEntry {
  return {
    patchId: patch.id,
    kind: patch.kind,
    label: patch.label,
    answer,
    ...scoreAnswer(patch.kind, answer),
  };
}

const SAMPLE_ANSWERS: Answer[] = ["moved", "still", "moved", "still"];

export const SAMPLE_RESULTS: RoundEntry[] = DEMO_ROUND.map((patch, index) =>
  buildEntry(patch, SAMPLE_ANSWERS[index]),
);

export function formatDelta(delta: number) {
  if (delta > 0) return `+${delta} XP`;
  if (delta < 0) return `−${Math.abs(delta)} XP`;
  return "0 XP";
}

export type Outcome = {
  title: string;
  tone: Tone;
  xpLabel: string;
  chose: string;
  badge: string;
  cardName: string;
  cardDescription: string;
  how: string;
  marker: "found" | "missed" | "glitch-good" | "glitch-fooled" | "none";
  markerLabel?: string;
};

export function describeOutcome(kind: PatchKind, answer: Answer): Outcome {
  const { correct, delta } = scoreAnswer(kind, answer);
  const chose =
    answer === "moved"
      ? "You chose “I see movement”."
      : "You chose “Nothing moving”.";

  if (kind === "mover") {
    return correct
      ? {
          title: "You found it",
          tone: "correct",
          xpLabel: formatDelta(delta),
          chose,
          badge: "Simulated object",
          cardName: "Mover example",
          cardDescription: "Simulated movement · design preview",
          how: "A moving object changes position while nearby stars stay put. Watch the ringed dot shift between A and B.",
          marker: "found",
        }
      : {
          title: "It was here",
          tone: "neutral",
          xpLabel: "0 XP · no penalty",
          chose,
          badge: "Simulated object",
          cardName: "Mover example",
          cardDescription: "Simulated movement · design preview",
          how: "It was here. Watch the ringed dot shift. Nearby stars stay in the same place, so their positions help you compare.",
          marker: "missed",
        };
  }

  if (kind === "glitch") {
    return correct
      ? {
          title: "Good eye",
          tone: "correct",
          xpLabel: formatDelta(delta),
          chose,
          badge: "Simulated glitch",
          cardName: "Glitch example",
          cardDescription: "Simulated camera artifact · design preview",
          how: "Good eye. Nothing real moved here. A camera artifact can appear in one image without moving across the sky.",
          marker: "glitch-good",
          markerLabel: "GLITCH / NOT MOVEMENT",
        }
      : {
          title: "That was a glitch",
          tone: "wrong",
          xpLabel: formatDelta(delta),
          chose,
          badge: "Simulated glitch",
          cardName: "Glitch example",
          cardDescription: "Simulated camera artifact · design preview",
          how: "A cosmic ray can hit the camera in one image only. A mark that appears once is not evidence of movement across the sky.",
          marker: "glitch-fooled",
          markerLabel: "ONE IMAGE ONLY",
        };
  }

  return correct
    ? {
        title: "Good eye",
        tone: "correct",
        xpLabel: formatDelta(delta),
        chose,
        badge: "No change",
        cardName: "Quiet patch",
        cardDescription: "Same sky in both images · design preview",
        how: "Good eye. Nothing moved between A and B, and “nothing” is a real answer.",
        marker: "none",
      }
    : {
        title: "Nothing moved",
        tone: "wrong",
        xpLabel: formatDelta(delta),
        chose,
        badge: "No change",
        cardName: "Quiet patch",
        cardDescription: "Same sky in both images · design preview",
        how: "Nothing moved between A and B. Check that the stars stay put before calling a mover.",
        marker: "none",
      };
}

export function resultSubtitle(entry: RoundEntry) {
  if (entry.answer === "moved") return "You saw movement";
  return entry.correct ? "Nothing moving — good eye" : "You saw nothing moving";
}
