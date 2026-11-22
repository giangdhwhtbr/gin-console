// TC: TC-MILESTONE-UI-011@d8eddb35
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
  const schedule = page.getByRole('figure', { name: 'Schedule' });
  // One bar per epic (aria-hidden drawing): compare geometry. The header day label of a working day starts where its column does.
  const bar = (id: string) => schedule.locator(`li[data-epic="${id}"] [data-bar="${id}"]`);
  const dayLabel = (day: number) => schedule.locator('[data-scroller] span.tabular-nums').filter({ hasText: new RegExp(`^(\\w{3} )?${day}$`) }).first();
  const box = async (l: ReturnType<typeof bar>) => (await l.boundingBox())!;

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByLabel('Kick-start date')).toHaveValue('2026-11-02');
    await expect(bar('A')).toBeVisible();
    await expect.poll(async () => Math.abs((await box(bar('A'))).x - (await box(dayLabel(2))).x)).toBeLessThan(1.5);
  });

  await ev.step('2. Set "Kick-start date" to 2026-11-16', async () => {
    await page.getByLabel('Kick-start date').fill('2026-11-16');
    await expect(page).toHaveURL(/[?&]start=2026-11-16(&|$)/);
    expect(stub.calls.some((u) => u.pathname === '/api/milestones/P/M1' && u.searchParams.get('start') === '2026-11-16')).toBe(true);
    await expect(page.getByText('Preview from Mon 16 Nov. Nothing changes until you run:')).toBeVisible();
    // A starts on the first day drawn (Mon 16 Nov) and B on the next day (Thu 19 Nov), right where A ends (Wed 18 Nov).
    await expect(bar('A')).toBeVisible();
    await expect.poll(async () => Math.abs((await box(bar('A'))).x - (await box(dayLabel(16))).x)).toBeLessThan(1.5);
    await expect
      .poll(async () => {
        const [a, b] = [await box(bar('A')), await box(bar('B'))];
        return Math.abs(b.x - (a.x + a.width));
      })
      .toBeLessThan(1.5);
    await expect(schedule.locator('[data-bead]')).toHaveCount(0);
    await expect(page.getByRole('figure', { name: 'Schedule' })).toHaveClass(/border-dashed/);
    await expect(page.getByText('gin milestone kickstart M1 --date 2026-11-16', { exact: true })).toBeVisible();
  });
});
