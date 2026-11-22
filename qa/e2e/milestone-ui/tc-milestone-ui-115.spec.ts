// TC: TC-MILESTONE-UI-115@bc9cf71f
// TC: TC-MILESTONE-UI-115@x
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

// The warning builders of support/api.ts type only `days`; `open_bugs` also carries a `count`.
const warn = (code: string, extra: { days?: number; count?: number } = {}) => ({ code, days: extra.days ?? null, ...extra }) as { code: string; days: number | null };

test('TC-MILESTONE-UI-115: An epic without warnings shows no verdict', async ({ page, ev }) => {
  // Precondition: M1 has epic C without warnings (epic D, with one, proves the verdicts had been drawn).
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestone: {
      M1: detail([epicPlan('C', { title: 'Epic C' }), epicPlan('D', { title: 'Epic D', planned_start: '2026-11-05', planned_end: '2026-11-06', warnings: [warn('unestimated')] })]),
    },
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.locator('[data-epic="D"] [data-verdict]')).toHaveText('No estimate');
    await expect(page.locator('[data-epic="C"]')).toBeVisible();
    await expect(page.locator('[data-epic="C"] [data-verdict]')).toHaveCount(0);
    await expect(page.locator('[data-epic="C"] svg[data-glyph="deferred"], [data-epic="C"] svg[data-glyph="blocked"]')).toHaveCount(0);
  });
});
