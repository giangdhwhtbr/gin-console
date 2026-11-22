// TC: TC-UI-278@13803bcb
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-UI-278: Legend on a phone', async ({ page, ev }) => {
  // Preconditions: a 390px wide window; project alpha has milestone m1.
  await page.setViewportSize({ width: 390, height: 800 });
  await stubApi(page, {
    projects: ['alpha'],
    milestone: { m1: detail([epicPlan('A', { title: 'Epic A' })]) },
  });

  await ev.step('1. Open `/milestones/alpha/m1`', async () => {
    await page.goto('/milestones/alpha/m1');
    await expect(page.getByRole('button', { name: 'Legend' })).toBeVisible();
  });

  await ev.step('2. Tap "Legend"', async () => {
    await page.getByRole('button', { name: 'Legend' }).tap().catch(() => page.getByRole('button', { name: 'Legend' }).click());
    const panel = page.getByRole('dialog', { name: 'Legend' });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    const widths = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(widths.s).toBeLessThanOrEqual(widths.c);
  });
});
