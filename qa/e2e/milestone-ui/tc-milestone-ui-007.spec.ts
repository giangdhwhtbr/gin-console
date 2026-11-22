// TC: TC-MILESTONE-UI-007@e4b9257f
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-007: Gantt shows an overflow warning past the end line', async ({ page, ev }) => {
  // Precondition: M1 ends Wed 4 Nov; epic A runs Mon 2 – Fri 6 Nov, so `show` warns `overflow` of 2 days.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
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
    const verdict = a.locator('[data-verdict]');
    await expect(verdict).toHaveText('2 working days past the end');
    await expect(verdict.locator('svg[data-glyph="deferred"]')).toHaveCount(1);
    await expect(verdict).toHaveClass(/text-state-blocked/);
    // The bar, its hatch and the end line are aria-hidden drawings: compare their geometry.
    await expect(a.locator('[data-bar="A"] [data-overflow]')).toHaveCount(1);
    const bar = await a.locator('[data-bar="A"]').boundingBox();
    const end = await page.locator('[data-line="end"]').boundingBox();
    expect(bar).not.toBeNull();
    expect(end).not.toBeNull();
    expect(bar!.x + bar!.width).toBeGreaterThan(end!.x + end!.width);
  });
});
