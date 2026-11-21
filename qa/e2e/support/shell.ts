// Stubs and locators shared by the navigation-shell specs (REQ-UI-055, 057, 063, 072, 073, 123 to 129).
import { expect, type Locator, type Page } from '@playwright/test';
import { bead, type BeadSummary, type Reply } from './api';

export const EMAIL = 'qa@example.com';

/** The bead as `GET /api/beads/{project}/{id}` answers it. */
export const detailOf = (b: BeadSummary, parent?: BeadSummary) => ({
  ...b, kind: null, capabilities: [], complexity: null, estimate_minutes: null, description: 'A description',
  design: null, notes: null, acceptance_criteria: null, close_reason: null,
  dependencies: parent ? [{ id: parent.id, title: parent.title, status: parent.status, type: 'parent-child' as const }] : [],
  dependents: [], children: [], bugs: [],
});

/** The beads of each project: for `stubApi({ beads })`, which asks by `?project=`. */
export const beadsOf = (byProject: Record<string, BeadSummary[]>) => (url: URL): BeadSummary[] =>
  byProject[url.searchParams.get('project') ?? ''] ?? [];

/** Bead pages: answers `/api/beads/{project}/{id}` and its comments for every bead of `byProject`. */
export async function stubBeadPages(page: Page, byProject: Record<string, BeadSummary[]>): Promise<void> {
  await page.route(/\/api\/beads\/[^/?]+\/[^/?]+(\/comments)?(\?.*)?$/, async (route) => {
    const parts = new URL(route.request().url()).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const comments = parts[parts.length - 1] === 'comments';
    if (comments) return route.fulfill({ json: [] });
    const [project, id] = parts.slice(2, 4);
    const found = byProject[project]?.find((b) => b.id === id);
    const reply: Reply = found ? { body: detailOf(found, byProject[project]?.find((b) => b.id === found.parent)) } : { status: 404, body: { error: 'not found' } };
    return route.fulfill({ status: reply.status ?? 200, json: reply.body });
  });
}

/** A list of `count` ready beads of one project, long enough to scroll. */
export const manyBeads = (count: number): BeadSummary[] =>
  Array.from({ length: count }, (_, i) => bead(`a-${i + 1}`, { title: `Bead number ${i + 1}`, ready: true }));

/** The "Main" navigation. */
export const mainNav = (page: Page): Locator => page.getByRole('navigation', { name: 'Main' });

/** The sidebar switcher (from 1024px, expanded): its name is the project and the count of projects. */
export const sidebarSwitcher = (page: Page, project: string): Locator =>
  page.getByRole('button', { name: new RegExp(`^${project}\\s*\\d+ projects$`) });

/** The list of projects the open switcher shows. */
export const projectList = (page: Page): Locator => page.getByRole('list', { name: 'Projects' });

/** The title and href of the first link of the breadcrumb. */
export async function firstCrumb(page: Page): Promise<{ text: string; href: string }> {
  const first = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('listitem').first();
  const link = first.getByRole('link');
  await expect(link).toBeVisible();
  return { text: ((await first.textContent()) ?? '').trim(), href: (await link.getAttribute('href')) ?? '' };
}
