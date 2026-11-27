// Stubs and locators for the Project timeline specs (REQ-MILESTONE-UI-033 to 038).
import { expect, type Locator, type Page } from '@playwright/test';
import { closedEpic, entry, forecast, forecastEpic, forecastMilestone, list, type MilestoneList } from './api';

export const timeline = (page: Page): Locator => page.getByRole('region', { name: 'Timeline' });
export const viewLink = (page: Page, name: 'Timeline' | 'List'): Locator => page.getByRole('navigation', { name: 'View' }).getByRole('link', { name, exact: true });
export const zoomButton = (page: Page, name: 'Weeks' | 'Months' | 'Quarters'): Locator => page.getByRole('group', { name: 'Zoom' }).getByRole('button', { name, exact: true });
export const axisHeader = (page: Page): Locator => page.getByTestId('axis-header');

/** The width in px of the element (a bar), to compare with days times the day width of the zoom. */
export async function widthOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('element has no box');
  return box.width;
}

export async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (box === null) throw new Error('element has no box');
  return box;
}

/** `ex-m2` Beta readiness, 16 Nov to 4 Dec 2026, with the epic `ex-e13` planned until 2 Feb 2027. */
export const betaList = (o: Partial<MilestoneList> = {}): MilestoneList =>
  list(
    [entry('ex-m2', { title: 'Beta readiness', status: 'active', start: '2026-11-16', end: '2026-12-04', finish: '2027-07-02', epics: { total: 1, closed: 0 } })],
    {
      today: '2026-11-26',
      forecast: forecast({
        finish: '2027-07-02', open_epics: 1, overflow_days: 150,
        milestones: [forecastMilestone('ex-m2', { start: '2026-12-11', finish: '2027-07-02', overflow_days: 150 })],
        epics: [
          forecastEpic('ex-e13', {
            milestone: 'ex-m2', title: 'Multi-currency pricing', planned_start: '2026-12-11', planned_end: '2027-02-02',
            remaining_days: 38, lane: 1, warnings: [{ code: 'overflow', days: 42 }],
          }),
        ],
      }),
      ...o,
    },
  );

/** Closed history of `example`: three closed milestones, the closed epic `ex-e2` of `ex-m1`, and the open `ex-m2`. */
export const historyList = (o: Partial<MilestoneList> = {}): MilestoneList =>
  list(
    [
      entry('ex-m0a', { title: 'Discovery', status: 'closed', start: '2026-08-03', end: '2026-09-04', finish: '2026-09-04' }),
      entry('ex-m0b', { title: 'Prototype', status: 'closed', start: '2026-09-07', end: '2026-10-02', finish: '2026-10-13' }),
      entry('ex-m1', { title: 'Foundations', status: 'closed', start: '2026-10-05', end: '2026-10-30', finish: '2026-10-30' }),
      entry('ex-m2', { title: 'Beta readiness', status: 'active', start: '2026-11-02', end: '2026-11-27', finish: '2026-11-27' }),
    ],
    {
      today: '2026-11-12',
      forecast: forecast({
        finish: '2026-11-27', open_epics: 1,
        milestones: [forecastMilestone('ex-m2', { start: '2026-11-03', finish: '2026-11-27' })],
        epics: [forecastEpic('ex-e3', { milestone: 'ex-m2', title: 'Billing exports', planned_start: '2026-11-03', planned_end: '2026-11-27', remaining_days: 10 })],
      }),
      closed_epics: [closedEpic('ex-e2', { title: 'Search relevance', milestone: 'ex-m1', start: '2026-10-12', end: '2026-10-28' })],
      ...o,
    },
  );
