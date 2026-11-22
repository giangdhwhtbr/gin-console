// TC: TC-REPORTS-037@d08e3ba6
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-037: Closed row', async ({ page, ev }) => {
  // Precondition: closed bead a-3 with cycle 0.9 days, late_days 2, rework 0.
  await stubReports(page);
  await page.route('**/api/reports/team**', (route) => {
    const project = new URL(route.request().url()).searchParams.get('project') ?? '';
    return route.fulfill({
      json: {
        ...teamBody(project),
        beads: [{
          id: 'a-3', title: 'Closed bead', issue_type: 'task', status: 'closed', bucket: 'closed', assignee: null, priority: 2,
          created_at: '2026-11-02T09:00:00Z', epic: { id: 'a-e1', title: 'Epic one' }, started_at: '2026-11-09T09:00:00Z',
          closed_at: '2026-11-10T09:00:00Z', cycle_days: 0.9, age_days: null, late_days: 2, rework: 0,
        }],
      },
    });
  });
  await page.goto('/reports?project=alpha&tab=team');

  await ev.step('1. Select the Closed list', async () => {
    await page.getByRole('tab', { name: /^Closed/ }).click();
    const row = page.getByRole('row').filter({ hasText: 'a-3' });
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell').filter({ hasText: /^0\.9 d$/ })).toBeVisible();
    await expect(row.getByText('2 d late')).toBeVisible();
    await expect(row.getByRole('cell').filter({ hasText: /^0$/ })).toBeVisible();
    await expect(row.getByRole('link', { name: 'Closed bead' })).toHaveAttribute('href', '/beads/alpha/a-3');
  });
});
