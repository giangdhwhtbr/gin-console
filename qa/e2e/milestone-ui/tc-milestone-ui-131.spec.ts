// TC: TC-MILESTONE-UI-131@e04f40b5
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { betaList, timeline } from '../support/timeline';

test('TC-MILESTONE-UI-131: Timeline on a phone', async ({ page, ev }) => {
  // Precondition: ex-m2 runs 16 Nov to 4 Dec and ex-e13 is planned 11 Dec to 2 Feb 2027; today is 26 Nov 2026.
  await stubApi(page, { projects: ['example'], milestones: betaList() });

  await ev.step('1. Set the window width to 390 px', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  await ev.step('2. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    const chart = timeline(page);
    await expect(chart.getByRole('link', { name: 'Beta readiness' })).toBeVisible();
    await expect(chart.getByRole('link', { name: 'Multi-currency pricing' })).toBeVisible();
    const sizes = await chart.locator('[data-scroller]').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(sizes.scroll).toBeGreaterThan(sizes.client);
    const page_ = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(page_.scroll).toBeLessThanOrEqual(page_.client);
  });
});
