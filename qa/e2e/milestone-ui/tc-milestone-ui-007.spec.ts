// TC: TC-MILESTONE-UI-007@b838aedc
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-007: Gantt shows an overflow warning past the end line', async ({ page, ev }) => {
  // Precondition: M1 ends Wed 4 Nov; epic A runs Mon 2 – Fri 6 Nov, so `show` warns `overflow` of 2 days.
  await stubApi(page, {
    milestone: {
      M1: detail(
        [
          epicPlan('A', {
            title: 'Epic A',
            estimate_days: 5,
            planned_start: '2026-11-02',
            planned_end: '2026-11-06',
            warnings: [{ code: 'overflow', days: 2 }],
          }),
        ],
        { end: '2026-11-04', finish: '2026-11-06', overflow_days: 2, today: '2026-11-04' },
      ),
    },
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('tab', { name: 'Gantt' })).toHaveAttribute('aria-selected', 'true');
    const a = page.getByRole('list', { name: 'Epics' }).getByRole('listitem').filter({ has: page.getByRole('link', { name: 'A', exact: true }) });
    await expect(a).toContainText('2 working days past the end');
    // The bar and the end line are aria-hidden drawings: compare their geometry.
    const bar = await a.locator('[data-bead]').last().boundingBox();
    const end = await page.locator('[data-line="end"]').boundingBox();
    expect(bar).not.toBeNull();
    expect(end).not.toBeNull();
    expect(bar!.x + bar!.width).toBeGreaterThan(end!.x + end!.width);
  });
});
