// TC: TC-MILESTONE-UI-125@60440e89
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { betaList, boxOf, timeline } from '../support/timeline';

test('TC-MILESTONE-UI-125: Milestone and its epics on the Timeline', async ({ page, ev }) => {
  // Precondition: ex-m2 runs 16 Nov to 4 Dec and its chain finishes 2 Jul 2027; ex-e13 is planned 11 Dec to 2 Feb, 38 days left, 42 days over; today is 26 Nov 2026.
  await stubApi(page, { projects: ['example'], milestones: betaList() });
  await page.setViewportSize({ width: 1280, height: 800 });

  await ev.step('1. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    const chart = timeline(page);
    const bar = await boxOf(chart.locator('[data-bar="milestone"]'));
    expect(bar.width).toBeCloseTo(19 * 6, 0);
    const hatch = await boxOf(chart.locator('[data-overrun]'));
    expect(hatch.width).toBeCloseTo(210 * 6, 0);
    expect(hatch.x).toBeCloseTo(bar.x + bar.width, 0);
    const row = chart.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Multi-currency pricing' }) }).last();
    await expect(row).toContainText('Lane 1');
    await expect(row).toContainText('38 d left');
    await expect(row.locator('svg[data-glyph="deferred"]')).toHaveCount(1);
    await expect(page.getByLabel('Multi-currency pricing: planned 11 Dec – 2 Feb, 38 days left, 42 days over')).toHaveCount(1);
  });
});
