// TC: TC-MILESTONE-UI-107@d756615d
import { test, expect } from '../evidence';
import { bead, entry, list, stubApi } from '../support/api';
import { reportBody, teamBody } from '../support/reports';

test('TC-MILESTONE-UI-107: Forecast after the end', async ({ page, ev }) => {
  // Preconditions: P has active m1 ending 1 Dec 2026 with forecast finish 16 Feb 2027 and an epic e1 in m1; the clock is 21 Nov 2026.
  await page.clock.setFixedTime(new Date('2026-11-21T09:00:00'));
  const m1 = entry('m1', { title: 'Checkout v2', status: 'active', start: '2026-11-10', end: '2026-12-01', finish: '2027-02-16' });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestones: list([m1], { today: '2026-11-21' }),
    beads: [bead('e1', { title: 'Epic one', issue_type: 'epic', status: 'in_progress', milestone: 'm1' })],
  });
  await page.route('**/api/reports/team**', (route) => {
    const body = teamBody('P');
    return route.fulfill({
      json: {
        ...body, today: '2026-11-21',
        milestones: [{ id: 'm1', title: 'Checkout v2', status: 'active', start: '2026-11-10', end: '2026-12-01', closed_on: null }],
        milestone: 'm1',
      },
    });
  });
  await page.route(/\/api\/reports\?/, (route) => route.fulfill({ json: reportBody('P') }));
  await page.route('**/api/beads/P/e1**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/comments')) return route.fulfill({ json: [] });
    if (path.endsWith('/reopens')) return route.fulfill({ json: { reopens: 0 } });
    if (path.endsWith('/workflow')) {
      return route.fulfill({ json: { stage: 'execute', gates: {}, warnings: [], review_waivers: [] } });
    }
    return route.fulfill({
      json: {
        ...bead('e1', { title: 'Epic one', issue_type: 'epic', status: 'in_progress', milestone: 'm1' }),
        description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null,
        dependencies: [], dependents: [], children: [], bugs: [],
      },
    });
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones?project=P&view=list', async () => {
    await page.goto('/milestones?project=P&view=list');
    const row = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem').filter({ hasText: 'Checkout v2' });
    await expect(row).toHaveCount(1);
    const finish = row.getByText('Finishes 16 Feb 2027');
    await expect(finish).toBeVisible();
    await expect(finish).toHaveClass(/text-state-blocked/);
  });

  await ev.step('3. Open /reports?project=P&tab=team', async () => {
    await page.goto('/reports?project=P&tab=team');
    const team = page.getByRole('link', { name: /^Team/ });
    await expect(team).toContainText('1 of 4 done, late');
    await expect(team.getByText('1 of 4 done, late')).toHaveClass(/text-state-blocked/);
    await expect(page.locator('[data-milestone-status]')).toHaveText('Active, late');
  });

  await ev.step('4. Open /beads/P/e1', async () => {
    await page.goto('/beads/P/e1');
    const card = page.getByRole('region', { name: 'Milestone' });
    await expect(card.getByRole('link', { name: 'm1 Checkout v2' })).toBeVisible();
    await expect(card.getByText('finish 16 Feb 2027, after the end')).toBeVisible();
  });
});
