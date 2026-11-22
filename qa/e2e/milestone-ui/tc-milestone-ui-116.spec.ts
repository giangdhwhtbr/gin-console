// TC: TC-MILESTONE-UI-116@02fb44bf
// TC: TC-MILESTONE-UI-116@x
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

// The warning builders of support/api.ts type only `days`; `open_bugs` also carries a `count`.
const warn = (code: string, extra: { days?: number; count?: number } = {}) => ({ code, days: extra.days ?? null, ...extra }) as { code: string; days: number | null };

test('TC-MILESTONE-UI-116: Rows have the same height whatever the warnings', async ({ page, ev }) => {
  // Precondition: M1 has epic D with 5 warnings and epic E with 1 warning.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestone: {
      M1: detail(
        [
          epicPlan('D', { title: 'Epic D', planned_start: '2026-11-02', planned_end: '2026-11-04', warnings: [warn('late'), warn('overflow', { days: 2 }), warn('open_bugs', { count: 3 }), warn('spec_due'), warn('unestimated')] }),
          epicPlan('E', { title: 'Epic E', planned_start: '2026-11-05', planned_end: '2026-11-06', warnings: [warn('unestimated')] }),
        ],
        { finish: '2026-11-06' },
      ),
    },
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.locator('[data-epic="D"] [data-verdict]')).toContainText('+4');
    await expect(page.locator('[data-epic="E"] [data-verdict]')).toHaveText('No estimate');
  });

  await ev.step('3. Measure the height of the rows of D and E', async () => {
    const d = await page.locator('[data-epic="D"]').boundingBox();
    const e = await page.locator('[data-epic="E"]').boundingBox();
    expect(d).not.toBeNull();
    expect(e).not.toBeNull();
    expect(d!.height).toBe(e!.height);
  });
});
