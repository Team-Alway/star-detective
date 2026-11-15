"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  DETECTORS,
  MODES,
  STRETCHES,
  parseDec,
  parseRA,
  type Detector,
  type Mode,
  type Stretch,
  type View,
} from "@/lib/sky";

export type ExploreState = {
  view: View | null;
  name: string | null;
  fov: number;
  mode: Mode;
  detector: Detector;
  stretch: Stretch;
  epoch: string | null;
  a: string | null;
  b: string | null;
  embed: boolean;
};

export type UrlPatch = Partial<Record<"ra" | "dec" | "fov" | "name" | "mode" | "detector" | "stretch" | "epoch" | "a" | "b", string | null>>;

export const DEFAULT_FOV = 6;

/** The page's state lives in the query string, so every view is a shareable link. */
export function useExploreUrl(forceEmbed = false) {
  const params = useSearchParams();

  const state = useMemo<ExploreState>(() => {
    const ra = parseRA(params.get("ra") ?? "");
    const dec = parseDec(params.get("dec") ?? "");
    const fovRaw = Number(params.get("fov"));
    const fov = Number.isFinite(fovRaw) && fovRaw >= 1 && fovRaw <= 30 ? fovRaw : DEFAULT_FOV;
    const mode = params.get("mode") as Mode;
    const detector = params.get("detector") as Detector;
    const stretch = params.get("stretch") as Stretch;
    return {
      view: ra !== null && dec !== null ? { ra, dec, fov } : null,
      name: params.get("name"),
      fov,
      mode: MODES.includes(mode) ? mode : "flip",
      detector: DETECTORS.some((d) => d.id === detector) ? detector : "all",
      stretch: STRETCHES.includes(stretch) ? stretch : "asinh",
      epoch: params.get("epoch"),
      a: params.get("a"),
      b: params.get("b"),
      embed: forceEmbed || params.get("embed") === "1",
    };
  }, [params, forceEmbed]);

  /** Merge a patch into the query string. push=true adds a history entry (new target). */
  const update = useCallback((patch: UrlPatch, push = false) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  return { state, update };
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true, // server: assume reduced so nothing autoplays before hydration
  );
}
