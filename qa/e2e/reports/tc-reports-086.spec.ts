// TC: TC-REPORTS-086@8a69fadd
import { test, expect } from '../evidence';
import { detail, epicPlan } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-086: Changes since kickoff and risks panels (REQ-REPORTS-030)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const unconfirmedEpics = Array.from({ length: 8 }, (_, i) => ({
    ...epicPlan(`e-${i + 1}`, { title: `Epic ${i + 1}` }),
    spec_confirmed: false,
  }));

  await stubReports(page, {
    projects: ['alpha'],
    status: {
      today: '2026-11-23',
      milestones: [{ id: 'm2', title: 'Checkout v2', status: 'active', start: '2026-11-11', end: '2026-12-02', closed_on: null }],
      milestone: 'm2',
      changes: {
        scope_from: 24,
        scope_to: 27,
        items: [
          {
            day: '2026-11-18', kind: 'bug_added', id: 'b-1', title: 'total shows NaN for empty cart',
            points: null, from: null, to: null, epic: { id: 'e-pay', title: 'Payment page' }, person: 'chi',
          },
          {
            day: '2026-11-18', kind: 'epic_added', id: 'e-gift', title: 'Gift cards',
            points: 3, from: null, to: null, epic: null, person: null,
          },
          {
            day: '2026-11-16', kind: 're_estimated', id: 'e-pay', title: 'Payment page',
            points: null, from: 5, to: 8, epic: null, person: null,
          },
        ],
      },
      risks: {
        blocked: [
          {
            id: 't-qa', title: 'End-to-end checkout QA', days: 4,
            blocker: { id: 't-mob', title: 'Mobile layout', person: 'bao', blocked: true },
          },
        ],
        blocked_more: 0,
        unestimated: [
          { id: 'u-1', title: 'Unest one' },
          { id: 'u-2', title: 'Unest two' },
          { id: 'u-3', title: 'Unest three' },
          { id: 'u-4', title: 'Unest four' },
        ],
      },
      epics: [{
        id: 'e-pay', title: 'Payment page', status: 'in_progress', points: 8, person: 'lead', closed_on: null,
        child_counts: { total: 2, closed: 1, in_progress: 1, blocked: 0, ready: 0, deferred: 0, prep_total: 0, prep_closed: 0 },
      }],
    },
  });

  await page.route('**/api/milestones/alpha/m2**', (route) =>
    route.fulfill({ json: detail(unconfirmedEpics as never, { id: 'm2', title: 'Checkout v2' }) }),
  );

  await ev.step('1. Open `/reports/status?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m2');
    const changes = page.locator('section', { has: page.getByRole('heading', { name: 'Changed since kickoff' }) });
    await expect(changes.getByText('Scope 24 → 27 points')).toBeVisible();
    await expect(changes.getByText('Bug: total shows NaN for empty cart')).toBeVisible();
    await expect(changes.getByText('Added 18 Nov under Payment page, chi')).toBeVisible();
    await expect(changes.getByText('Gift cards added with 3 points')).toBeVisible();
    await expect(changes.getByText('Payment page re-estimated from 5 to 8 points')).toBeVisible();
    await expect(changes.getByText('16 Nov', { exact: true })).toBeVisible();
    await expect(changes.getByRole('link', { name: 'total shows NaN for empty cart' })).toHaveAttribute('href', '/beads/alpha/b-1');
    await expect(changes.getByRole('link', { name: 'Gift cards' })).toHaveAttribute('href', '/beads/alpha/e-gift');

    const risks = page.locator('section', { has: page.getByRole('heading', { name: 'Risks' }) });
    await expect(risks.getByText('End-to-end checkout QA waits on Mobile layout')).toBeVisible();
    await expect(risks.getByText('Mobile layout is blocked too, bao, 4 days')).toBeVisible();
    await expect(risks.getByRole('link', { name: 'End-to-end checkout QA' })).toHaveAttribute('href', '/beads/alpha/t-qa');
    await expect(risks.getByRole('link', { name: 'Mobile layout' })).toHaveAttribute('href', '/beads/alpha/t-mob');
    await expect(risks.getByText('4 epics have no estimate')).toBeVisible();
    await expect(risks.getByText('Unest one')).toBeVisible();
    await expect(risks.getByText('Unest two')).toBeVisible();
    await expect(risks.getByText('Unest three')).toBeVisible();
    await expect(risks.getByText('1 more')).toBeVisible();
    await expect(risks.getByText('8 of 8 epics: spec not approved yet')).toBeVisible();
  });
});
