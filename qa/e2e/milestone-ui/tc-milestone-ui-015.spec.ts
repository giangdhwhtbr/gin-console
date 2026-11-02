// TC: TC-MILESTONE-UI-015@a6e080d5
import { test, expect } from '../evidence';
import { detail, epicPlan, failure, stubApi } from '../support/api';

test('TC-MILESTONE-UI-015: Failed preview shows the error and no bars', async ({ page, ev }) => {
  // Precondition: planned milestone M1 of project P; `show --start 2026-11-16` exits 1, so the API answers 502.
  const message = 'gin-workflow milestone show M1 --start 2026-11-16 exited 1';
  const stub = await stubApi(page, {
    milestone: (url) =>
      url.searchParams.get('start') === null
        ? detail(
            [
              epicPlan('A', { title: 'Epic A', planned_start: '2026-11-02', planned_end: '2026-11-04' }),
              epicPlan('B', { title: 'Epic B', planned_start: '2026-11-05', planned_end: '2026-11-09', depends_on: ['A'] }),
            ],
            { status: 'planned', finish: '2026-11-09' },
          )
        : failure(message),
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByLabel('Kick-start date')).toHaveValue('2026-11-02');
    await expect(page.locator('[data-bead]').first()).toBeVisible(); // the current plan is drawn before the preview
  });

  await ev.step('2. Set "Kick-start date" to 2026-11-16', async () => {
    await page.getByLabel('Kick-start date').fill('2026-11-16');
    await expect(page).toHaveURL(/[?&]start=2026-11-16(&|$)/);
    const alert = page.getByRole('tabpanel', { name: 'Gantt' }).getByRole('alert');
    await expect(alert).toContainText("Milestones couldn't be loaded");
    await expect(alert).toContainText(message);
    expect(stub.calls.some((u) => u.pathname === '/api/milestones/P/M1' && u.searchParams.get('start') === '2026-11-16')).toBe(true);
    await expect(page.getByRole('figure', { name: 'Schedule' })).toHaveCount(0);
    await expect(page.locator('[data-bead]')).toHaveCount(0);
    await expect(page.getByText('Preview from')).toHaveCount(0);
  });
});
