"use client";

import { useSyncExternalStore } from "react";
import { authFetch, type ApiUser } from "@/lib/api";

type AuthState = { user: ApiUser | null; ready: boolean };

let state: AuthState = { user: null, ready: false };
let started = false;
const listeners = new Set<() => void>();
const userHooks = new Set<(user: ApiUser | null) => void>();

function set(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
  userHooks.forEach((h) => h(next.user));
}

/** Registered by progress.ts so it can sync when the user changes. */
export function onUserChange(hook: (user: ApiUser | null) => void) {
  userHooks.add(hook);
}

export function getUser() {
  return state.user;
}

async function refresh() {
  try {
    set({ user: await authFetch<ApiUser>("/api/auth/me"), ready: true });
  } catch {
    set({ user: null, ready: true });
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!started && typeof window !== "undefined") {
    started = true;
    void refresh();
  }
  return () => listeners.delete(cb);
}

const serverState: AuthState = { user: null, ready: false };

export async function login(email: string, password: string) {
  const user = await authFetch<ApiUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  set({ user, ready: true });
  return user;
}

export async function signup(email: string, password: string, display_name: string) {
  const user = await authFetch<ApiUser>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name }),
  });
  set({ user, ready: true });
  return user;
}

export async function logout() {
  try {
    await authFetch<void>("/api/auth/logout", { method: "POST" });
  } finally {
    set({ user: null, ready: true });
  }
}

export function useAuth() {
  const s = useSyncExternalStore(subscribe, () => state, () => serverState);
  return { ...s, login, signup, logout };
}
