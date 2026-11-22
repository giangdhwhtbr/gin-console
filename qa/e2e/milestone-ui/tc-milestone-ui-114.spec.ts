// TC: TC-MILESTONE-UI-114@34d97e44
// TC: TC-MILESTONE-UI-114@x
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

// The warning builders of support/api.ts type only `days`; `open_bugs` also carries a `count`.
const warn = (code: string, extra: { days?: number; count?: number } = {}) => ({ code, days: extra.days ?? null, ...extra }) as { code: string; days: number | null };

test('TC-MILESTONE-UI-114: Late comes first in the verdict', async ({ page, ev }) => {
  // Precondition: M1 has epic B with the warnings unestimated and late, planned to end on 12 Nov.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestone: {
      M1: detail([epicPlan('B', { title: 'Epic B', estimate_days: null, planned_start: '2026-11-02', planned_end: '2026-11-12', warnings: [warn('unestimated'), warn('late')] })], { finish: '2026-11-12' }),
    },
  });
  const verdict = page.locator('[data-epic="B"] [data-verdict]');

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(verdict).toHaveCount(1);
    await expect(verdict).toHaveText('Late: should have finished 12 Nov+1');
    await expect(verdict.locator('svg[data-glyph="blocked"]')).toHaveCount(1);
    await expect(verdict).toHaveClass(/text-state-blocked/);
    await expect(verdict.getByText('+1', { exact: true })).toBeVisible();
  });
});
