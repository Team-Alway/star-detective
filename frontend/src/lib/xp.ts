import type { RoundEntry } from "@/lib/demo";

export const storageKey = "star-detective";

export type PlayerProgress = {
  xp: number;
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

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    return;
  }
}

export function saveRound(round: RoundEntry[]): void {
  saveProgress({
    xp: round.reduce((total, entry) => total + entry.delta, 0),
    results: Object.fromEntries(round.map((entry) => [entry.patchId, entry.correct])),
    round,
  });
}
