// Builders and stubs for the Graph view specs (TC-UI-063..077, 098..129, 207..220): a project of epics and tasks,
// its bead pages, and the locators of the nodes and of the visually hidden list of arrows.
import type { Locator, Page } from '@playwright/test';
import { bead, stubApi, type BeadSummary, type Stub } from './api';
import { stubDetails } from './lanes';

export const epicOf = (id: string, o: Partial<BeadSummary> = {}): BeadSummary => bead(id, { issue_type: 'epic', ...o });
/** A bead of `parent` blocked by `blockers`. */
export const taskOf = (id: string, parent: string | null, blockers: string[] = [], o: Partial<BeadSummary> = {}): BeadSummary =>
  bead(id, { parent, blocked_by: blockers, dependency_count: blockers.length, blocked: blockers.length > 0, ...o });
export const closedOn = { status: 'closed', closed_at: '2026-10-09T00:00:00Z' } as const;

/** Routes /api for `project` with `beads` (their `dependent_count` filled in from the blockers) and their bead pages. */
export async function stubProject(page: Page, project: string, beads: BeadSummary[]): Promise<Stub> {
  const filled = beads.map((b) => ({ ...b, dependent_count: Math.max(b.dependent_count, beads.filter((o) => o.blocked_by.includes(b.id)).length) }));
  const stub = await stubApi(page, { projects: [project], beads: filled });
  await stubDetails(page, filled, project);
  return stub;
}

export const nodeOf = (page: Page, id: string): Locator => page.locator(`[data-node="${id}"]`);
/** The visually hidden list of arrows ("b is blocked by a"), one entry per arrow. */
export const arrowsOf = (page: Page): Locator => page.getByRole('list', { name: 'Dependencies' }).locator('> li > span');
export const panelOf = (page: Page): Locator => page.getByRole('complementary', { name: 'Bead details' });
