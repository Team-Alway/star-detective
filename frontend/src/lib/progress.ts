"use client";

import { useSyncExternalStore } from "react";
import { authFetch, type ServerProgress } from "@/lib/api";
import { getUser, onUserChange, useAuth } from "@/lib/auth";
import { progressEvent, readProgress, saveProgress, storageKey } from "@/lib/xp";

export const STAGE_XP = 20;
const MAX_STAGE = 5;

type Snapshot = { xp: number; stage: number };
let cached: Snapshot = { xp: 0, stage: 1 };
const server: Snapshot = { xp: 0, stage: 1 };

function snapshot(): Snapshot {
  const p = readProgress();
  const xp = p.xp ?? 0;
  const stage = p.stage ?? 1;
  if (cached.xp !== xp || cached.stage !== stage) cached = { xp, stage };
  return cached;
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === storageKey) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(progressEvent, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(progressEvent, cb);
  };
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;
function schedulePush() {
  if (!getUser()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const p = readProgress();
    authFetch("/api/progress", {
      method: "PUT",
      body: JSON.stringify({ xp: p.xp, stage: p.stage ?? 1, results: p.results }),
    }).catch(() => {});
  }, 400);
}

function update(fn: (xp: number, stage: number) => { xp: number; stage: number }) {
  const p = readProgress();
  const next = fn(p.xp ?? 0, p.stage ?? 1);
  saveProgress({ ...p, xp: next.xp, stage: Math.min(MAX_STAGE, Math.max(1, next.stage)) });
  schedulePush();
}

export function addXp(amount: number) {
  update((xp, stage) => ({ xp: Math.max(0, xp + amount), stage }));
}

export function unlockStage(n: number) {
  update((xp, stage) => ({ xp, stage: Math.max(stage, n) }));
}

/** Awards 20 XP once per stage question and unlocks the next stage. Returns true if XP was newly awarded. */
export function awardStageQuestion(stage: number): boolean {
  const p = readProgress();
  const key = `academy-stage-${stage}`;
  const fresh = !p.results[key];
  saveProgress({
    ...p,
    xp: (p.xp ?? 0) + (fresh ? STAGE_XP : 0),
    stage: Math.min(MAX_STAGE, Math.max(p.stage ?? 1, stage + 1)),
    results: { ...p.results, [key]: true },
  });
  schedulePush();
  return fresh;
}

async function syncWithServer() {
  try {
    const remote = await authFetch<ServerProgress>("/api/progress");
    const local = readProgress();
    const merged = {
      ...local,
      xp: Math.max(local.xp ?? 0, remote.xp ?? 0),
      stage: Math.max(local.stage ?? 1, remote.stage ?? 1),
      results: { ...(remote.results ?? {}), ...local.results },
    };
    saveProgress(merged);
    await authFetch("/api/progress", {
      method: "PUT",
      body: JSON.stringify({ xp: merged.xp, stage: merged.stage, results: merged.results }),
    });
  } catch {
    /* offline: stay local */
  }
}

onUserChange((user) => {
  if (user) void syncWithServer();
});

export function useProgress() {
  const s = useSyncExternalStore(subscribe, snapshot, () => server);
  const { user, ready } = useAuth();
  return { xp: s.xp, stage: s.stage, user: user ? { display_name: user.display_name } : null, ready };
}
