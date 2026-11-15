"use client";

import { useSyncExternalStore } from "react";

export type Stage = 1 | 2 | 3 | 4 | 5;
let stage: Stage = 1;
let scroll = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setSpaceStage(next: number) {
  const s = Math.min(5, Math.max(1, Math.round(next))) as Stage;
  if (s === stage) return;
  stage = s;
  emit();
}
/** 0..1 scroll fly-through progress (landing page). */
export function setSpaceScroll(p: number) {
  scroll = Math.min(1, Math.max(0, p));
  emit();
}
export const getSpaceStage = () => stage;
export const getSpaceScroll = () => scroll;
export function subscribeSpace(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function useSpaceStage(): Stage {
  return useSyncExternalStore(subscribeSpace, getSpaceStage, () => 1 as Stage);
}
