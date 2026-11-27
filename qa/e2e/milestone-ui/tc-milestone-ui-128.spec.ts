// TC: TC-MILESTONE-UI-128@6af52ffe
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { axisHeader, betaList, timeline, widthOf, zoomButton } from '../support/timeline';

test('TC-MILESTONE-UI-128: Zoom changes the day width', async ({ page, ev }) => {
  // Precondition: ex-m2 runs 16 Nov to 4 Dec (19 days) and an epic is planned until 2 Feb 2027; today is 26 Nov 2026.
  await stubApi(page, { projects: ['example'], milestones: betaList() });
  const bar = () => timeline(page).locator('[data-bar="milestone"]');

  await ev.step('1. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    await expect(zoomButton(page, 'Months')).toHaveAttribute('aria-pressed', 'true');
    await expect(zoomButton(page, 'Weeks')).toHaveAttribute('aria-pressed', 'false');
    await expect(zoomButton(page, 'Quarters')).toHaveAttribute('aria-pressed', 'false');
    expect(new URL(page.url()).searchParams.has('zoom')).toBe(false);
    expect(await widthOf(bar())).toBeCloseTo(19 * 6, 0);
  });

  await ev.step('2. Press Quarters', async () => {
    await zoomButton(page, 'Quarters').click();
    await expect(page).toHaveURL(/[?&]zoom=quarters(&|$)/);
    await expect(zoomButton(page, 'Quarters')).toHaveAttribute('aria-pressed', 'true');
    await expect(zoomButton(page, 'Months')).toHaveAttribute('aria-pressed', 'false');
    expect(await widthOf(bar())).toBeCloseTo(19 * 2, 0);
    await expect(axisHeader(page).getByText('Q4 2026', { exact: true })).toBeVisible();
    await expect(axisHeader(page).getByText('Q1 2027', { exact: true })).toBeVisible();
  });

  await ev.step('3. Press Weeks', async () => {
    await zoomButton(page, 'Weeks').click();
    await expect(page).toHaveURL(/[?&]zoom=weeks(&|$)/);
    await expect(zoomButton(page, 'Weeks')).toHaveAttribute('aria-pressed', 'true');
    expect(await widthOf(bar())).toBeCloseTo(19 * 24, 0);
  });
});
