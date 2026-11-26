// Stubbed /api/requirements* for the specs of the Requirements page (REQ-REQUIREMENTS-012 to 019, REQ-UI-055 to 126).
// Shapes: frontend/src/features/requirements/api.ts. Everything else is answered by `stubApi` of ./api.
import type { Page } from '@playwright/test';
import { stubApi, type Reply, type Stub } from './api';

export type Signoff = {
  state: 'none' | 'waived' | 'current' | 'changed' | 'unknown version';
  actor: string | null; at: string | null; change: string | null; evidence: string | null; source: string | null;
};
export type Requirement = {
  id: string; title: string; capability: string; state: 'living' | 'proposed' | 'removed';
  status: 'failing' | 'building' | 'unknown' | 'covered' | 'untested' | null; reasons: string[];
  signoff: Signoff;
  changes: { folder: string; change: string; epic: string | null; op: string; archived: string | null }[];
  beads: { id: string; title: string; status: string }[] | null;
  cases: { id: string; effective_result: string }[] | null;
  tests: string[];
};
export type RequirementList = { layout: string; requirements: Requirement[]; warnings: string[]; skipped: string[] };
export type Scenarios = { id: string; title: string; source: string | null; scenarios: { title: string; given: string[]; when: string[]; then: string[] }[] };
export type ChangeRow = {
  folder: string; change: string; title: string; epic: string | null; archived: string | null;
  signoff: Signoff | null; added: number | null; modified: number | null; removed: number | null;
};
export type ChangeList = { changes: ChangeRow[]; error: string | null; cause: 'outdated' | 'schema' | null };
export type ChangeContent = Omit<ChangeRow, 'signoff' | 'added' | 'modified' | 'removed'> & { files: Record<string, string> };
export type Mockup = {
  capability: string; date: string; confirmed: string; confirmed_by: string | null; description: string;
  html: string[]; images: string[]; requirements: string[];
};

export const signoff = (o: Partial<Signoff> = {}): Signoff => ({ state: 'none', actor: null, at: null, change: null, evidence: null, source: null, ...o });

export const requirement = (id: string, o: Partial<Requirement> = {}): Requirement => ({
  id, title: `Title ${id}`, capability: id.split('-')[1].toLowerCase(), state: 'living', status: 'covered', reasons: [],
  signoff: signoff(), changes: [], beads: [], cases: [], tests: [], ...o,
});

export const requirementList = (requirements: Requirement[], o: Partial<RequirementList> = {}): RequirementList => ({
  layout: 'sdd', requirements, warnings: [], skipped: [], ...o,
});

export const changeRow = (folder: string, o: Partial<ChangeRow> = {}): ChangeRow => ({
  folder, change: folder, title: `Change ${folder}`, epic: null, archived: null, signoff: signoff(), added: 0, modified: 0, removed: 0, ...o,
});

export const changeContent = (folder: string, files: Record<string, string>, o: Partial<ChangeContent> = {}): ChangeContent => ({
  folder, change: folder, title: `Change ${folder}`, epic: null, archived: null, files, ...o,
});

export const mockup = (o: Partial<Mockup> = {}): Mockup => ({
  capability: 'ui', date: '2026-11-22', confirmed: '2026-11-22', confirmed_by: 'ba', description: 'Reports screen',
  html: ['mockup/index.html'], images: [], requirements: [], ...o,
});

type Answer<T> = T | Reply;
const reply = <T>(answer: Answer<T>): Reply =>
  typeof answer === 'object' && answer !== null && 'body' in answer && Object.keys(answer).every((k) => k === 'body' || k === 'status')
    ? (answer as Reply) : { body: answer };

/** The answer of the requirements endpoints when a spec sets none: an empty project. */
const NOTHING = { list: requirementList([]), changes: { changes: [], error: null, cause: null } satisfies ChangeList, mockups: { mockups: [] } };

/** The 502 of a failed gin, as the server sends it (REQ-REQUIREMENTS-005). */
export const gone = (error: string, cause: 'outdated' | 'schema' | null = null): Reply => ({ status: 502, body: { error, cause } });

/** The headers the server puts on every mockup file (REQ-REQUIREMENTS-011). */
export const MOCKUP_HEADERS = {
  'content-security-policy': "sandbox allow-scripts; connect-src 'none'; form-action 'none'; frame-src 'none'",
  'x-content-type-options': 'nosniff',
};

/** A 1x1 transparent PNG. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/**
 * Routes `/api/requirements*` for one page on top of `stubApi` (projects default to ["P"]).
 * `list`, `changes` and `mockups` answer the three lists; `scenarios` answers `/reqs/{project}/{id}` by id
 * (an id it does not hold answers 404); `change` answers `/changes/{project}/{folder}` by folder (an unknown folder answers 404).
 * `files` answers mockup files by path under `/files/{capability}/{date}/` with the content type and body given; the headers of the server are added.
 */
export async function stubRequirements(
  page: Page,
  opts: {
    projects?: string[];
    list?: Answer<RequirementList>;
    scenarios?: Record<string, Answer<Scenarios>> | Reply;
    changes?: Answer<ChangeList>;
    change?: Record<string, ChangeContent>;
    mockups?: Answer<{ mockups: Mockup[] }>;
    files?: Record<string, { type: string; body: string | Buffer }>;
    beads?: Parameters<typeof stubApi>[1]['beads'];
  } = {},
): Promise<Stub> {
  const stub = await stubApi(page, { projects: opts.projects, beads: opts.beads });
  await page.route('**/api/requirements**', async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent); // ["api", "requirements", ...]
    let out: Reply = { status: 404, body: { error: 'not stubbed' } };
    if (parts.length === 2) out = reply(opts.list ?? NOTHING.list);
    else if (parts[2] === 'changes' && parts.length === 3) out = reply(opts.changes ?? NOTHING.changes);
    else if (parts[2] === 'mockups' && parts.length === 3) out = reply(opts.mockups ?? NOTHING.mockups);
    else if (parts[2] === 'reqs' && parts.length === 5) {
      const s = opts.scenarios;
      if (s !== undefined && 'body' in s && Object.keys(s).every((k) => k === 'body' || k === 'status')) out = s as Reply;
      else {
        const found = (s as Record<string, Answer<Scenarios>> | undefined)?.[parts[4]];
        out = found === undefined ? { status: 404, body: { error: 'not found' } } : reply(found);
      }
    } else if (parts[2] === 'changes' && parts.length === 5) {
      const found = opts.change?.[parts[4]];
      out = found === undefined ? { status: 404, body: { error: 'not found' } } : { body: found };
    } else if (parts[2] === 'mockups' && parts[4] === 'files') {
      const file = opts.files?.[parts.slice(7).join('/')];
      if (file !== undefined) return route.fulfill({ status: 200, contentType: file.type, headers: MOCKUP_HEADERS, body: file.body });
      out = { status: 404, body: { detail: 'Not Found' } };
    }
    stub.calls.push(url);
    return route.fulfill({ status: out.status ?? 200, json: out.body });
  });
  return stub;
}
