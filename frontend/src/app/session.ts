import { useSyncExternalStore } from "react";
import { navigate } from "./route";

export type SessionUser = { name: string; email: string; projects: string[] };

export type SessionState =
  | { status: "loading" }
  | { status: "off" }
  | { status: "signed-out"; returnTo: string | null }
  | { status: "signed-in"; user: SessionUser };

export type SignInResult =
  | { ok: true }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; minutes: number }
  | { ok: false; reason: "error" };

const listeners = new Set<() => void>();
let state: SessionState = { status: "loading" };

function set(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

function parseUser(value: unknown): SessionUser | null {
  if (!isRecord(value)) return null;
  const { name, email, projects } = value;
  if (typeof name !== "string" || typeof email !== "string" || !isStringList(projects)) return null;
  return { name, email, projects };
}

export function getSession(): SessionState {
  return state;
}

export const subscribeSession = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useSession(): SessionState {
  return useSyncExternalStore(subscribeSession, getSession);
}

/** Asks the server whether auth is on and who is signed in; an answer that cannot be read means auth is off. */
export async function loadSession(): Promise<void> {
  try {
    const response = await fetch("/api/auth/me");
    const body: unknown = response.ok ? await response.json() : null;
    if (!isRecord(body) || body.enabled !== true) return set({ status: "off" });
    const user = parseUser(body.user);
    set(user === null ? { status: "signed-out", returnTo: null } : { status: "signed-in", user });
  } catch {
    set({ status: "off" }); // the server could not be reached or sent no JSON: the pages show their own errors
  }
}

export async function signIn(username: string, password: string): Promise<SignInResult> {
  const returnTo = state.status === "signed-out" ? state.returnTo : null;
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.status === 401) return { ok: false, reason: "invalid" };
    if (response.status === 429) {
      return { ok: false, reason: "locked", minutes: Math.max(1, Math.ceil(Number(response.headers.get("Retry-After")) / 60)) };
    }
    const user = response.ok ? parseUser(await response.json()) : null;
    if (user === null) return { ok: false, reason: "error" };
    set({ status: "signed-in", user });
    if (returnTo !== null) navigate(returnTo);
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // the server could not be reached: the screen still returns to sign-in, and the cookie ends with its TTL
  }
  set({ status: "signed-out", returnTo: null });
}

/** fetch that notices a lost session: a 401 while signed in shows the sign-in screen and keeps the page for later. */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await (init === undefined ? fetch(input) : fetch(input, init));
  if (response.status === 401 && state.status === "signed-in") {
    set({ status: "signed-out", returnTo: window.location.pathname + window.location.search });
  }
  return response;
}

/** Tests only: auth off, as the console runs without a users file. */
export function resetSession(): void {
  set({ status: "off" });
}
