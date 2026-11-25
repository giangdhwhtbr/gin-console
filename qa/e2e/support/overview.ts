// Shared by the specs of the Overview page (REQ-OVERVIEW-005 to 011): stubs and locators.
import type { Locator, Page } from '@playwright/test';
import { entry, list, type MilestoneList } from './api';
import { statusBody } from './reports';

export const EMAIL = 'qa@example.com';

/** Signs the user in, as the shell expects before any page. */
export const signIn = (page: Page) => page.addInitScript((email) => window.localStorage.setItem('gin-console.email', email), EMAIL);

/** `GET /api/reports/status` of an on-track milestone `m1` ending 20 Nov 2026, on 12 Nov. */
export const onTrackStatus = (project: string) =>
  statusBody(project, {
    milestone: 'm1',
    milestones: [{ id: 'm1', title: 'Beta readiness', status: 'active', start: '2026-11-02', end: '2026-11-20', closed_on: null }],
  });

/** `GET /api/milestones` with a forecast `finish` after the `end` of `m1`: the verdict becomes Late. */
export const lateForecast: MilestoneList = list([entry('m1', { title: 'Beta readiness', status: 'active', start: '2026-11-02', end: '2026-11-20', finish: '2026-11-25' })]);

/** The section of the Overview page whose heading has this name. */
export const section = (page: Page, heading: string | RegExp): Locator =>
  page.getByRole('heading', { name: heading }).locator('xpath=ancestor::section[1]');

/** The epic named in the path of a workflow request (`/api/beads/<project>/<epic>/workflow`). */
export const epicOf = (url: URL): string => decodeURIComponent(url.pathname.split('/')[4] ?? '');

/** `count` in-progress epics `e-1`…`e-<count>` of one project. */
export const epics = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `e-${i + 1}`, title: `Epic e-${i + 1}` }));
