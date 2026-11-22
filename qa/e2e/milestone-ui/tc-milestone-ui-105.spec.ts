// TC: TC-MILESTONE-UI-105@6252963b
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-MILESTONE-UI-105: Bead page of a milestone', async ({ page, ev }) => {
  // Preconditions: ex-m2 is an open milestone bead, kicked off 10 Nov 2026; the clock is 21 Nov 2026; the API reports it active.
  await page.clock.setFixedTime(new Date('2026-11-21T09:00:00'));
  await stubApi(page, {
    milestoneOptions: {
      milestones: [milestoneOption('ex-m2', { title: 'Example two', status: 'active', start: '2026-11-10', end: '2026-11-27' })],
      current: null,
    },
  });
  await page.route('**/api/beads/P/ex-m2**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/comments')) return route.fulfill({ json: [] });
    if (path.endsWith('/reopens')) return route.fulfill({ json: { reopens: 0 } });
    return route.fulfill({
      json: {
        ...bead('ex-m2', { title: 'Example two', issue_type: 'milestone', status: 'open' }),
        description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null,
        dependencies: [], dependents: [], children: [], bugs: [],
      },
    });
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /beads/P/ex-m2', async () => {
    await page.goto('/beads/P/ex-m2');
    const header = page.locator('header').filter({ has: page.getByRole('heading', { name: 'Example two', level: 1 }) });
    const mark = header.locator('[data-status="active"]');
    await expect(mark).toHaveText('Active');
    await expect(mark.locator('svg')).toBeVisible();
    await expect(header.getByText('Open', { exact: true })).toHaveCount(0);
    await expect(header.getByText('Ready', { exact: true })).toHaveCount(0);
  });
});
