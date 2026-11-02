// TC: TC-MILESTONE-UI-044@1c83333b
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-044: Zoom kept with the preview', async ({ page, ev }) => {
  // Precondition: planned milestone M1 of project P. With `start`, the backend answers the schedule replanned from it.
  const plan = (from: string, a: [string, string], b: [string, string], preview: boolean) =>
    detail(
      [
        epicPlan('A', { title: 'Epic A', planned_start: a[0], planned_end: a[1] }),
        epicPlan('B', { title: 'Epic B', planned_start: b[0], planned_end: b[1], depends_on: ['A'] }),
      ],
      { status: 'planned', schedule_start: from, preview, finish: b[1] },
    );
  const stub = await stubApi(page, {
    milestone: (url) => {
      const start = url.searchParams.get('start');
      return start === null
        ? plan('2026-11-02', ['2026-11-02', '2026-11-04'], ['2026-11-05', '2026-11-09'], false)
        : plan(start, ['2026-11-16', '2026-11-18'], ['2026-11-19', '2026-11-23'], true);
    },
  });
  const schedule = page.getByRole('figure', { name: 'Schedule' });
  const zoom = schedule.getByRole('group', { name: 'Zoom' });
  const range = schedule.locator('[data-range]');

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    await expect(page.getByLabel('Kick-start date')).toHaveValue('2026-11-02');
    await expect(zoom.getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(range).toHaveText('2 Nov – 8 Nov');
  });

  await ev.step('2. Set "Kick-start date" to 2026-11-16', async () => {
    await page.getByLabel('Kick-start date').fill('2026-11-16');
    await expect(page).toHaveURL(/[?&]start=2026-11-16(&|$)/);
    await expect(page).toHaveURL(/[?&]zoom=1w(&|$)/);
    expect(stub.calls.some((u) => u.pathname === '/api/milestones/P/M1' && u.searchParams.get('start') === '2026-11-16')).toBe(true);
    await expect(page.getByText('Preview from Mon 16 Nov. Nothing changes until you run:')).toBeVisible();
    await expect(schedule).toHaveClass(/border-dashed/);
    await expect(schedule.locator('[data-bead="2026-11-16"]').first()).toBeVisible();
    await expect(zoom.getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(zoom.getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'false');
    // One week in view (Monday to Sunday); the preview keeps the first day in view (GanttChart.tsx).
    await expect(range).toHaveText('2 Nov – 8 Nov');
  });
});
