// TC: TC-MILESTONE-UI-061@f1df6cb1
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-061: Dependent starting too early draws a blocked arrow', async ({ page, ev }) => {
  // Precondition: B depends on A, A ends 2026-11-05 and B starts 2026-11-05.
  await stubApi(page, {
    milestone: {
      M1: detail([
        epicPlan('A', { planned_start: '2026-11-02', planned_end: '2026-11-05' }),
        epicPlan('B', { planned_start: '2026-11-05', planned_end: '2026-11-09', depends_on: ['A'] }),
      ]),
    },
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    const arrow = page.locator('path[data-from="A"][data-to="B"]');
    await expect(arrow).toHaveAttribute('data-late', 'true');
    await expect(arrow).toHaveClass(/text-state-blocked/);
    await expect(arrow).toHaveAttribute('marker-end', /-late\)$/);
  });
});
