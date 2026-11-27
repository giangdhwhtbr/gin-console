// Stubbed /api/qa/* for the Tests page, the case page and the Readiness tab (REQ-QA-010 to REQ-QA-013).
// Use after `stubApi` of ./api: a route added later answers first. Shapes: frontend/src/features/qa/api.ts.
import type { Page } from '@playwright/test';
import type { Reply } from './api';

export type CaseRow = {
  id: string; title: string; capability: string; type: string; priority: string; result: string;
  effective_result: string; reqs: string[]; bug: string | null; file: string;
};
export type Counts = { name: string; passed: number; failed: number; blocked: number; not_run: number; outdated: number; other: number; total: number };
export type RunStep = { n: number; title: string; status: string; error: string | null; screenshot: boolean };
export type LatestRun = { folder: string; status: string | null; started: string | null; finished: string | null; error: string | null; steps: RunStep[] };
export type CaseDetail = Omit<CaseRow, 'bug'> & {
  preconditions: string[]; steps: string[]; expected: string[];
  bug: { id: string; title: string | null; status: string | null; priority: number | null } | null;
  latest_run: LatestRun | null; latest_run_reason: 'no_run' | 'not_on_host' | 'invalid' | null;
};
export type ReadinessItem = {
  key: 'cases' | 'results' | 'bugs' | 'gates'; title: string; state: 'pass' | 'fail' | 'unknown';
  note: string | null; error: string | null;
  requirements: { id: string; title: string; capability: string }[];
  cases: { id: string; title: string; effective_result: string; bug: string | null }[];
  bugs: { id: string; title: string; priority: number; epic: { id: string; title: string } | null }[];
  epics: { id: string; title: string; gate: string }[];
};

/** The "not ready" answer of `GET /api/qa/readiness/{project}/{milestone}` of the spec (REQ-QA-008), as a start for a spec. */
export const readinessItem = (key: ReadinessItem['key'], o: Partial<ReadinessItem> = {}): ReadinessItem => ({
  key, title: { cases: 'Every requirement has a case', results: 'Every case passed since its requirement changed', bugs: 'No open P0 or P1 bug', gates: 'Every epic shipped' }[key],
  state: 'pass', note: null, error: null, requirements: [], cases: [], bugs: [], epics: [], ...o,
});

export const caseRow = (id: string, o: Partial<CaseRow> = {}): CaseRow => ({
  id, title: `Title of ${id}`, capability: 'ui', type: 'e2e', priority: 'medium', result: 'passed', effective_result: 'passed',
  reqs: ['REQ-UI-001'], bug: null, file: `qa/cases/ui/${id}.e2e.md`, ...o,
});

const RESULTS = ['passed', 'failed', 'blocked', 'not run', 'outdated'] as const;
const countsBy = (cases: CaseRow[], by: 'capability' | 'type'): Counts[] =>
  [...new Set(cases.map((c) => c[by]))].sort().map((name) => {
    const rows = cases.filter((c) => c[by] === name);
    const n = (key: string) => rows.filter((c) => c.effective_result === key).length;
    const counts = { name, passed: n('passed'), failed: n('failed'), blocked: n('blocked'), not_run: n('not run'), outdated: n('outdated'), other: 0, total: rows.length };
    counts.other = rows.filter((c) => !(RESULTS as readonly string[]).includes(c.effective_result)).length;
    return counts;
  });

/** `GET /api/qa/cases` of these cases, with the counts the backend works out. */
export const caseList = (cases: CaseRow[]) => ({
  cases, counts: { by_capability: countsBy(cases, 'capability'), by_type: countsBy(cases, 'type') },
});

export const caseDetail = (id: string, o: Partial<CaseDetail> = {}): CaseDetail => ({
  ...caseRow(id), bug: null, preconditions: [], steps: [], expected: [], latest_run: null, latest_run_reason: 'no_run', ...o,
});

export const latestRun = (steps: RunStep[], o: Partial<LatestRun> = {}): LatestRun => ({
  folder: 'qa/evidence/2026-11-23T10-34-33', status: 'failed', started: '2026-11-23T10:34:33.000Z',
  finished: '2026-11-23T10:34:40.000Z', error: null, steps, ...o,
});

/** A 1x1 PNG, the screenshot every step of a stubbed run serves. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

type Answer<T> = T | Reply | ((url: URL) => T | Reply);
const isReply = (v: unknown): v is Reply =>
  typeof v === 'object' && v !== null && 'body' in v && Object.keys(v).every((k) => k === 'body' || k === 'status');

/** An error of the QA API, as the backend sends it (REQ-QA-002). */
export const qaFailure = (error: string, cause: 'missing' | 'outdated' | null = null): Reply => ({ status: 502, body: { error, cause } });

/**
 * Routes /api/qa/*. `cases` answers the list, `details` the case pages by id (an id not in it answers 404),
 * `readiness` the checklist; `screenshots` is true to serve `PNG` for every step screenshot request.
 */
export async function stubQa(
  page: Page,
  opts: { cases?: Answer<ReturnType<typeof caseList>>; details?: Record<string, CaseDetail | Reply>; readiness?: Answer<unknown>; screenshots?: boolean } = {},
): Promise<{ calls: URL[] }> {
  const stub = { calls: [] as URL[] };
  await page.route('**/api/qa/**', async (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent); // ["api", "qa", ...]
    const answer = (value: unknown): Promise<void> => {
      const reply: Reply = isReply(value) ? value : { body: value };
      return route.fulfill({ status: reply.status ?? 200, json: reply.body });
    };
    const pick = <T>(a: Answer<T>): unknown => (typeof a === 'function' ? (a as (u: URL) => unknown)(url) : a);
    if (parts[2] === 'cases' && parts.length === 3 && opts.cases !== undefined) return answer(pick(opts.cases));
    if (parts[2] === 'cases' && parts.length === 5 && opts.details !== undefined) return answer(opts.details[parts[4]] ?? { status: 404, body: { error: 'not found' } });
    if (parts[2] === 'cases' && parts[5] === 'run' && parts[8] === 'screenshot' && opts.screenshots === true) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    }
    if (parts[2] === 'readiness' && opts.readiness !== undefined) return answer(pick(opts.readiness));
    return answer({ status: 404, body: { error: 'not stubbed' } });
  });
  return stub;
}
