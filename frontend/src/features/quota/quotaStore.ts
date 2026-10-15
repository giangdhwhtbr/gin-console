import { fetchQuota, type Quota } from "./api";

export type QuotaSnapshot =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; quota: Quota; error: string | null };
export type QuotaState = { snapshot: QuotaSnapshot; pending: boolean };

// simplified: one module-level store so the strip and the page share a single request and the
// last answer; replace with a query cache when a second kind of server data needs one.
const initial: QuotaState = { snapshot: { status: "loading" }, pending: false };
let state: QuotaState = initial;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: QuotaState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export const getQuotaState = (): QuotaState => state;

export function subscribeQuota(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadQuota(refresh: boolean): Promise<void> {
  if (inflight !== null) return inflight;
  set({ ...state, pending: true });
  inflight = fetchQuota(refresh)
    .then(
      (quota) => set({ snapshot: { status: "ok", quota, error: null }, pending: false }),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const previous = state.snapshot;
        set({
          snapshot:
            previous.status === "ok" ? { ...previous, error: message } : { status: "error", message },
          pending: false,
        });
      },
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function resetQuotaStore(): void {
  state = initial;
  inflight = null;
}
