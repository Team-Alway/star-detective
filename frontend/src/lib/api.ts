import type { PatchDetail, PatchSummary } from "@/lib/types";

/** Backend base URL. Set NEXT_PUBLIC_API_URL in frontend/.env.local; defaults to the local FastAPI server. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${path}`);
  }
  return response.json();
}

/** Stage 4 = Training (Quick Spotter), stage 5 = Explore (Viewer). Omit for every patch. */
export function fetchPatches(stage?: 4 | 5): Promise<PatchSummary[]> {
  return getJson(`/api/v1/patches${stage ? `?stage=${stage}` : ""}`);
}

/** Full metadata plus the known anomaly and reveal card. */
export function fetchPatch(id: string): Promise<PatchDetail> {
  return getJson(`/api/v1/patches/${encodeURIComponent(id)}?include_answer=true`);
}

/** Image URLs from the API are relative paths, so they need the backend origin. */
export function absoluteUrl(path: string) {
  return /^https?:/.test(path) ? path : `${API_URL}${path}`;
}
