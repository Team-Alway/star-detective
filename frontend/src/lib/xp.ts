import type { RoundEntry } from "@/lib/demo";

export const storageKey = "star-detective";

export type PlayerProgress = {
  xp: number;
  /** Highest unlocked academy stage (1-5). */
  stage?: number;
  results: Record<string, boolean>;
  round?: RoundEntry[];
};

const emptyProgress: PlayerProgress = {
  xp: 0,
  results: {},
};

export function readProgress(): PlayerProgress {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : emptyProgress;
  } catch {
    return emptyProgress;
  }
}

export const progressEvent = "star-detective:progress";

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(progressEvent));
}

export function saveRound(round: RoundEntry[]): void {
  const prev = readProgress();
  const prevRound = (prev.round ?? []).reduce((total, entry) => total + entry.delta, 0);
  const next = round.reduce((total, entry) => total + entry.delta, 0);
  saveProgress({
    ...prev,
    xp: Math.max(0, prev.xp - prevRound + next),
    stage: prev.stage ?? 1,
    results: { ...prev.results, ...Object.fromEntries(round.map((entry) => [entry.patchId, entry.correct])) },
    round,
  });
}
