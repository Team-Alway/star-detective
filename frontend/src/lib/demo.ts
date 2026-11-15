export const SOURCE_URL =
  "https://www.jpl.nasa.gov/images/pia26280-first-images-from-nasas-spherex/";

export type PatchKind = "mover" | "glitch" | "none";
export type Answer = "moved" | "still";
export type Tone = "correct" | "wrong" | "neutral";

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

export function buildEntry(
  patch: { id: string; kind: PatchKind; label: string },
  answer: Answer,
): RoundEntry {
  return {
    patchId: patch.id,
    kind: patch.kind,
    label: patch.label,
    answer,
    ...scoreAnswer(patch.kind, answer),
  };
}

export function formatDelta(delta: number) {
  if (delta > 0) return `+${delta} XP`;
  if (delta < 0) return `−${Math.abs(delta)} XP`;
  return "0 XP";
}

export function resultSubtitle(entry: RoundEntry) {
  if (entry.answer === "moved") return "You saw movement";
  return entry.correct ? "Nothing moving — good eye" : "You saw nothing moving";
}
