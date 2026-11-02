// TC: TC-MILESTONE-UI-047@315b1443
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-047: Click without drag still opens the link', async ({ page, ev }) => {
  // Precondition: M1 holds epic A; its plan spans 2026-11-02 to 2026-11-27, so at 1 week the chart scrolls sideways.
  const plan = detail(
    [epicPlan('A', { title: 'Epic A', planned_start: '2026-11-02', planned_end: '2026-11-13', estimate_days: 10 })],
    { start: '2026-11-02', end: '2026-11-27', finish: '2026-11-27', schedule_start: '2026-11-02' },
  );
  await stubApi(page, { milestone: { M1: plan } });
  // The helper does not answer the bead page's APIs; stub them inline (routes added later win).
  await page.route('**/api/beads/P/A**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/comments')) return route.fulfill({ json: [] });
    if (path.endsWith('/reopens')) return route.fulfill({ json: { reopens: 0 } });
    return route.fulfill({
      json: {
        ...bead('A', { title: 'Epic A', issue_type: 'epic' }),
        description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null,
        dependencies: [], dependents: [], children: [], bugs: [],
      },
    });
  });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1?zoom=1w', async () => {
    await page.goto('/milestones/P/M1?zoom=1w');
    await expect(schedule.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(schedule.getByRole('link', { name: 'A', exact: true })).toBeVisible();
  });

  await ev.step("2. Click A's id without moving the mouse", async () => {
    const box = (await schedule.getByRole('link', { name: 'A', exact: true }).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
    // The bead page /beads/P/A opens.
    await expect(page).toHaveURL(/\/beads\/P\/A$/);
    await expect(page.getByRole('heading', { name: 'Epic A', level: 1 })).toBeVisible();
  });
});
