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

export type ApiUser = { id: number | string; email: string; display_name: string };
export type ServerProgress = { xp: number; stage: number; results: Record<string, boolean>; updated_at?: string };
export type LeaderboardRow = { display_name: string; xp: number };

/**
 * Account calls (login, progress, leaderboard) carry the session cookie.
 * In production they go to this site's own /api/* path, which next.config.ts proxies to the backend,
 * so the cookie is first-party (Safari and iOS block cross-site cookies).
 */
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_VIA_PROXY === "1" ? "" : API_URL;

export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${AUTH_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : "";
    } catch {}
    const error = new Error(detail || `Request failed (${response.status})`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const fetchLeaderboard = () => authFetch<LeaderboardRow[]>("/api/leaderboard");
