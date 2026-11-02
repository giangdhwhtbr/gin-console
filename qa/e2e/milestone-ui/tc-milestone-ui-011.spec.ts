// TC: TC-MILESTONE-UI-011@dd0dee45
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-011: Kick-start preview redraws the Gantt from the picked date', async ({ page, ev }) => {
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
  const firstDay = (id: string) =>
    page
      .getByRole('list', { name: 'Epics' })
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: id, exact: true }) })
      .locator('[data-bead]')
      .first();

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByLabel('Kick-start date')).toHaveValue('2026-11-02');
    await expect(firstDay('A')).toHaveAttribute('data-bead', '2026-11-02');
  });

  await ev.step('2. Set "Kick-start date" to 2026-11-16', async () => {
    await page.getByLabel('Kick-start date').fill('2026-11-16');
    await expect(page).toHaveURL(/[?&]start=2026-11-16(&|$)/);
    expect(stub.calls.some((u) => u.pathname === '/api/milestones/P/M1' && u.searchParams.get('start') === '2026-11-16')).toBe(true);
    await expect(page.getByText('Preview from Mon 16 Nov. Nothing changes until you run:')).toBeVisible();
    await expect(firstDay('A')).toHaveAttribute('data-bead', '2026-11-16');
    await expect(firstDay('B')).toHaveAttribute('data-bead', '2026-11-19');
    await expect(page.getByRole('figure', { name: 'Schedule' })).toHaveClass(/border-dashed/);
    await expect(page.getByText('gin-workflow milestone kickstart M1 --date 2026-11-16', { exact: true })).toBeVisible();
  });
});
