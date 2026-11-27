import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/session";
import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

export type QaCause = "missing" | "outdated";
export type CaseRow = { id: string; title: string; capability: string; type: string; priority: string; result: string; effective_result: string; reqs: string[]; bug: string | null; file: string };
export type CaseCounts = { name: string; passed: number; failed: number; blocked: number; not_run: number; outdated: number; other: number; total: number };
export type CaseList = { cases: CaseRow[]; counts: { by_capability: CaseCounts[]; by_type: CaseCounts[] } };
export type CaseBug = { id: string; title: string | null; status: string | null; priority: number | null };
export type RunStep = { n: number; title: string; status: string; error: string | null; screenshot: boolean };
export type LatestRun = { folder: string; status: string | null; started: string | null; finished: string | null; error: string | null; steps: RunStep[] };
export type RunReason = "no_run" | "not_on_host" | "invalid";
export type CaseDetail = Omit<CaseRow, "bug"> & {
  preconditions: unknown[];
  steps: unknown[];
  expected: unknown[];
  bug: CaseBug | null;
  latest_run: LatestRun | null;
  latest_run_reason: RunReason | null;
};

/** The results a count can be filtered on; `not_run` is the URL value of "not run". */
export const RESULT_KEYS = ["passed", "failed", "blocked", "not_run", "outdated", "other"] as const;
export type ResultKey = (typeof RESULT_KEYS)[number];

export class QaFailure extends Error {
  readonly status: number;
  readonly cause: QaCause | null;
  constructor(message: string, status: number, cause: QaCause | null = null) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const every = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);
const has = (value: object, keys: readonly string[], check: (item: unknown) => boolean) => keys.every((key) => check(field(value, key)));
const isCaseRow = (value: unknown) =>
  isObject(value) &&
  has(value, ["id", "title", "capability", "type", "priority", "result", "effective_result", "file"], isString) &&
  isStringOrNull(field(value, "bug")) &&
  every(field(value, "reqs"), isString);
const isCounts = (value: unknown) => isObject(value) && isString(field(value, "name")) && has(value, ["passed", "failed", "blocked", "not_run", "outdated", "other", "total"], isFiniteNumber);
const isCaseList = (value: unknown): value is CaseList => {
  if (!isObject(value)) return false;
  const counts = field(value, "counts");
  return every(field(value, "cases"), isCaseRow) && isObject(counts) && every(field(counts, "by_capability"), isCounts) && every(field(counts, "by_type"), isCounts);
};
const isBug = (value: unknown) => isObject(value) && isString(field(value, "id")) && has(value, ["title", "status"], isStringOrNull) && (field(value, "priority") === null || isFiniteNumber(field(value, "priority")));
const isStep = (value: unknown) =>
  isObject(value) && isFiniteNumber(field(value, "n")) && has(value, ["title", "status"], isString) && isStringOrNull(field(value, "error")) && typeof field(value, "screenshot") === "boolean";
const isRun = (value: unknown) =>
  isObject(value) && isString(field(value, "folder")) && has(value, ["status", "started", "finished", "error"], isStringOrNull) && every(field(value, "steps"), isStep);
const isCaseDetail = (value: unknown): value is CaseDetail => {
  if (!isObject(value)) return false;
  const reason = field(value, "latest_run_reason");
  return (
    has(value, ["id", "title", "capability", "type", "priority", "result", "effective_result", "file"], isString) &&
    every(field(value, "reqs"), isString) &&
    has(value, ["preconditions", "steps", "expected"], Array.isArray) &&
    (field(value, "bug") === null || isBug(field(value, "bug"))) &&
    (field(value, "latest_run") === null || isRun(field(value, "latest_run"))) &&
    (reason === null || reason === "no_run" || reason === "not_on_host" || reason === "invalid")
  );
};

async function get<T>(path: string, check: (value: unknown) => value is T): Promise<T> {
  const response = await apiFetch(path);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = isObject(body) ? field(body, "error") : null;
    const cause = isObject(body) ? field(body, "cause") : null;
    throw new QaFailure(typeof error === "string" ? error : `The server answered ${response.status}`, response.status, cause === "missing" || cause === "outdated" ? cause : null);
  }
  if (!check(body)) throw new QaFailure("unexpected response", response.status);
  return body;
}

const enc = encodeURIComponent;
export const fetchCases = (project: string) => get(`/api/qa/cases?project=${enc(project)}`, isCaseList);
export const fetchCase = (project: string, id: string) => get(`/api/qa/cases/${enc(project)}/${enc(id)}`, isCaseDetail);
export const screenshotUrl = (project: string, id: string, n: number): string => `/api/qa/cases/${enc(project)}/${enc(id)}/run/steps/${n}/screenshot`;
export const testsHref = (project: string, extra: Readonly<Record<string, string>> = {}): string => `/tests?${new URLSearchParams({ project, ...extra }).toString()}`;
export const caseHref = (project: string, id: string): string => `/tests/${enc(project)}/${enc(id)}`;

export type Fetched<T> = { status: "loading" } | { status: "error"; failure: QaFailure } | { status: "ok"; data: T };
const asFailure = (error: unknown) => (error instanceof QaFailure ? error : new QaFailure(error instanceof Error ? error.message : String(error), 0));

/** Load once per `fetcher` (memoised by the caller); an answer of an older fetcher is dropped. */
export function useFetched<T>(fetcher: () => Promise<T>): { state: Fetched<T>; retry: () => void } {
  const [held, setHeld] = useState<{ of: () => Promise<T>; state: Fetched<T> } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void fetcher().then(
      (data) => live && setHeld({ of: fetcher, state: { status: "ok", data } }),
      (error: unknown) => live && setHeld({ of: fetcher, state: { status: "error", failure: asFailure(error) } }),
    );
    return () => {
      live = false;
    };
  }, [fetcher, attempt]);
  const retry = useCallback(() => {
    setHeld(null);
    setAttempt((n) => n + 1);
  }, []);
  return { state: held !== null && held.of === fetcher ? held.state : { status: "loading" }, retry };
}
