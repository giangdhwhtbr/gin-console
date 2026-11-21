// Stubs for the project list with a `pull` (REQ-BEADS-018): GET /api/projects and GET /api/projects/beads.
import type { Page } from '@playwright/test';
import { stubApi } from './api';

export type Pull = { status: 'ok' | 'no_remote' | 'error'; at: string; error: string | null };

export type PullProject = { name: string; path: string; beads?: unknown; pull?: Pull | null };

/** A pull that happened `seconds` ago. */
export const pulled = (seconds: number, o: Partial<Pull> = {}): Pull => ({
  status: 'ok', at: new Date(Date.now() - seconds * 1000).toISOString(), error: null, ...o,
});

/** Answers both project lists with `projects` (a project without `pull` has no such key, like an older backend). Later routes win, so this goes after `stubApi`. */
export async function stubProjectPulls(page: Page, projects: PullProject[]): Promise<void> {
  await stubApi(page, { projects: projects.map((p) => p.name) });
  const body = projects.map((p) => ({ exists: true, workflow: null, beads: null, ...p }));
  await page.route((url) => url.pathname === '/api/projects' || url.pathname === '/api/projects/beads', (route) => route.fulfill({ json: body }));
}
