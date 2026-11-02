// Stubbed /api/* for gin-qa e2e specs (qa/guidelines.md: "specs stub the matching /api/* responses").
// The builders mirror frontend/src/features/{milestones,beads}/*Fixtures.ts so a spec only states
// the data its case is about. Shapes: frontend/src/features/{milestones,beads,projects}/api.ts.
import type { Page } from '@playwright/test';

export type Reply = { status?: number; body: unknown };
type Answer<T> = T | Reply | ((url: URL) => T | Reply);

export type MilestoneEntry = {
  id: string; title: string; status: string; start: string; end: string;
  kickoff: string | null; finish: string | null;
  epics: { total: number; closed: number }; warnings: number | null; error: string | null;
};
export type MilestoneList = { milestones: MilestoneEntry[]; unassigned_epics: number; today: string };
export type EpicPlan = {
  id: string; title: string; status: string; estimate_days: number | null;
  planned_start: string; planned_end: string; depends_on: string[];
  external_depends_on: { id: string; milestone: string | null }[];
  warnings: { code: string; days: number | null }[];
};
export type MilestoneDetail = {
  id: string; title: string; description: string; status: string; start: string; end: string;
  kickoff: string | null; schedule_start: string; preview: boolean; today: string;
  finish: string | null; overflow_days: number; epics: EpicPlan[];
};
export type BeadSummary = {
  id: string; title: string; status: string; priority: number; issue_type: string; labels: string[];
  owner: string | null; assignee: string | null; parent: string | null;
  created_at: string; updated_at: string; dependency_count: number; dependent_count: number;
  comment_count: number; ready: boolean; blocked: boolean; created_by: string | null;
  blocked_by: string[]; closed_at: string | null;
};

export const entry = (id: string, o: Partial<MilestoneEntry> = {}): MilestoneEntry => ({
  id, title: `Title ${id}`, status: 'planned', start: '2026-11-02', end: '2026-12-18', kickoff: null,
  finish: '2026-12-22', epics: { total: 6, closed: 0 }, warnings: 0, error: null, ...o,
});

export const list = (milestones: MilestoneEntry[], o: Partial<MilestoneList> = {}): MilestoneList => ({
  milestones, unassigned_epics: 0, today: '2026-10-29', ...o,
});

export const epicPlan = (id: string, o: Partial<EpicPlan> = {}): EpicPlan => ({
  id, title: `Title ${id}`, status: 'open', estimate_days: 3, planned_start: '2026-11-02',
  planned_end: '2026-11-04', depends_on: [], external_depends_on: [], warnings: [], ...o,
});

export const detail = (epics: EpicPlan[], o: Partial<MilestoneDetail> = {}): MilestoneDetail => ({
  id: 'M1', title: 'Beta readiness', description: '', status: 'planned', start: '2026-11-02',
  end: '2026-11-13', kickoff: null, schedule_start: '2026-11-02', preview: false, today: '2026-10-29',
  finish: '2026-11-04', overflow_days: 0, epics, ...o,
});

export const bead = (id: string, o: Partial<BeadSummary> = {}): BeadSummary => ({
  id, title: `Title ${id}`, status: 'open', priority: 2, issue_type: 'task', labels: [], owner: null,
  assignee: null, parent: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-10T00:00:00Z',
  dependency_count: 0, dependent_count: 0, comment_count: 0, ready: false, blocked: false,
  created_by: null, blocked_by: [], closed_at: null, ...o,
});

/** A 502 from the milestones API, as the backend sends it (REQ-MILESTONE-UI-008). */
export const failure = (error: string, cause: 'outdated' | 'tracking' | 'schema' | null = null): Reply => ({
  status: 502, body: { error, cause },
});

const isReply = (v: unknown): v is Reply =>
  typeof v === 'object' && v !== null && 'body' in v && Object.keys(v).every((k) => k === 'body' || k === 'status');

function resolve<T>(answer: Answer<T>, url: URL): Reply {
  const value = typeof answer === 'function' ? (answer as (u: URL) => T | Reply)(url) : answer;
  return isReply(value) ? value : { body: value };
}

export type Stub = {
  /** Every /api request the page made, in order. */
  calls: URL[];
};

/**
 * Routes /api/* for one page. `projects` lists the configured project names (default ["P"]).
 * `milestones` answers GET /api/milestones?project=…; `milestone` answers GET /api/milestones/{project}/{id}
 * (a map by id, or a function of the URL, which carries `start`). `beads` answers GET /api/beads: an array
 * is filtered like the backend (closed beads only with `closed=1`); it defaults to [] so pages that also
 * load beads (Epics not in a milestone, Gantt children) do not show an error. Anything else answers 404.
 */
export async function stubApi(
  page: Page,
  opts: {
    projects?: string[];
    milestones?: Answer<MilestoneList>;
    milestone?: Record<string, MilestoneDetail> | ((url: URL) => MilestoneDetail | Reply);
    beads?: BeadSummary[] | ((url: URL) => BeadSummary[] | Reply);
  } = {},
): Promise<Stub> {
  const stub: Stub = { calls: [] };
  const projects = (opts.projects ?? ['P']).map((name) => ({
    name, path: `/home/gin/${name}`, exists: true, workflow: null, beads: null,
  }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    stub.calls.push(url);
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent); // ["api", ...]
    let reply: Reply = { status: 404, body: { error: 'not stubbed' } };
    if (url.pathname === '/api/projects') reply = { body: projects };
    else if (url.pathname === '/api/milestones' && opts.milestones !== undefined) reply = resolve(opts.milestones, url);
    else if (parts[1] === 'milestones' && parts.length === 4 && opts.milestone !== undefined) {
      const m = opts.milestone;
      if (typeof m === 'function') reply = resolve(m, url);
      else if (m[parts[3]] !== undefined) reply = { body: m[parts[3]] };
    } else if (url.pathname === '/api/beads') {
      const b = opts.beads ?? [];
      reply = typeof b === 'function'
        ? resolve(b, url)
        : { body: url.searchParams.get('closed') === '1' ? b : b.filter((x) => x.status !== 'closed') };
    }
    await route.fulfill({ status: reply.status ?? 200, json: reply.body });
  });
  return stub;
}
