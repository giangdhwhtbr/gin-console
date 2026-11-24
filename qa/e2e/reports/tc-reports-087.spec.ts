// TC: TC-REPORTS-087@944cfbd2
import { test, expect } from '../evidence';
import { detail, entry, epicPlan, list } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-087: Status epic table open, closed, unsplit and failed detail (REQ-REPORTS-031)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const milestones = list([
    entry('m2', { title: 'Checkout v2', status: 'active', start: '2026-11-11', end: '2026-12-02', finish: '2026-11-30' }),
  ], {
    today: '2026-11-23',
    forecast: {
      deadline: null, lanes: 2, start: '2026-11-11', finish: '2027-01-01', overflow_days: 0, open_epics: 2, unestimated: 0, error: null,
      epics: [
        { id: 'e-1', milestone: 'm2', planned_start: '2026-11-11', planned_end: '2026-11-25', estimate_source: 'points' },
        { id: 'e-5', milestone: 'm2', planned_start: '2026-12-10', planned_end: '2027-01-01', estimate_source: 'assumed' },
      ],
    },
  } as never);

  await stubReports(page, {
    projects: ['alpha'],
    milestones,
    status: {
      today: '2026-11-23',
      milestones: [{ id: 'm2', title: 'Checkout v2', status: 'active', start: '2026-11-11', end: '2026-12-02', closed_on: null }],
      milestone: 'm2',
      epics: [
        {
          id: 'e-1', title: 'Team checkout', status: 'in_progress', points: 8, person: 'lead', closed_on: null,
          child_counts: { total: 4, closed: 2, in_progress: 1, blocked: 0, ready: 1, deferred: 0, prep_total: 0, prep_closed: 0 },
        },
        {
          id: 'e-5', title: 'Unsplit epic', status: 'open', points: 5, person: 'Unassigned', closed_on: null,
          child_counts: { total: 0, closed: 0, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 },
        },
        {
          id: 'e-3', title: 'Closed epic', status: 'closed', points: 3, person: 'ann', closed_on: '2026-11-20',
          child_counts: { total: 2, closed: 2, in_progress: 0, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 },
        },
      ],
    },
  });

  await page.route('**/api/milestones/alpha/m2**', (route) =>
    route.fulfill({
      json: detail([
        epicPlan('e-1', {
          title: 'Team checkout', status: 'in_progress', planned_start: '2026-11-11', planned_end: '2026-11-20',
          warnings: [{ code: 'late', days: 3 }],
        }),
        epicPlan('e-5', {
          title: 'Unsplit epic', status: 'open', planned_start: '2026-12-10', planned_end: '2026-12-18',
        }),
      ], { id: 'm2', title: 'Checkout v2', start: '2026-11-11', end: '2026-12-02', today: '2026-11-23' }),
    }),
  );

  await ev.step('1. Open `/reports/status?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m2');
    const table = page.locator('section', { has: page.getByRole('heading', { name: 'Epics' }) }).getByRole('table');
    await expect(table).toBeVisible();

    const row1 = table.getByRole('row', { name: /Team checkout/ });
    await expect(row1.getByRole('link', { name: 'Team checkout' })).toHaveAttribute('href', '/beads/alpha/e-1');
    await expect(row1.getByText(/late/i)).toBeVisible();
    await expect(row1.getByRole('img')).toBeVisible();
    await expect(row1.getByText('11 Nov – 20 Nov')).toBeVisible();
    await expect(row1.getByText('25 Nov')).toBeVisible();
    await expect(row1.getByText('lead', { exact: true })).toBeVisible();

    const row5 = table.getByRole('row', { name: /Unsplit epic/ });
    await expect(row5.getByText('Not split yet')).toBeVisible();
    await expect(row5.getByText('1 Jan 2027?')).toBeVisible();
    await expect(row5.getByText('Unassigned', { exact: true })).toBeVisible();

    const row3 = table.getByRole('row', { name: /Closed epic/ });
    await expect(row3.getByText('Done', { exact: true })).toBeVisible();
    await expect(row3.getByText('20 Nov', { exact: true })).toBeVisible();
  });
});
