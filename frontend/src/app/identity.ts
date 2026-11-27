import { useSyncExternalStore } from "react";
import { getSession, subscribeSession } from "./session";

export const EMAIL_KEY = "gin-console.email";

const listeners = new Set<() => void>();
let memory: string | null | undefined; // undefined: storage not read yet

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(value.trim());
}

export function getEmail(): string | null {
  const session = getSession();
  if (session.status === "signed-in") return session.user.email.toLowerCase();
  if (memory === undefined) {
    try {
      const stored = window.localStorage.getItem(EMAIL_KEY);
      memory = stored !== null && isEmail(stored) ? stored.trim().toLowerCase() : null;
    } catch {
      memory = null; // storage refused: nobody is signed in yet
    }
  }
  return memory;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function setEmail(value: string): void {
  const email = value.trim().toLowerCase();
  memory = email;
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // storage refused: the email lasts for this visit only
  }
  notify();
}

export function clearEmail(): void {
  memory = null;
  try {
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    // storage refused: nothing was kept
  }
  notify();
}

/** Tests only: forget the in-memory value so the next read goes to storage. */
export function resetIdentity(): void {
  memory = undefined;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const stopSession = subscribeSession(listener);
  return () => {
    listeners.delete(listener);
    stopSession();
  };
};

export function useEmail(): string | null {
  return useSyncExternalStore(subscribe, getEmail);
}
