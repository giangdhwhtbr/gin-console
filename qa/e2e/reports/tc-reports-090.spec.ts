// TC: TC-REPORTS-090@fb2d0f43
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-090: Team unassigned note and Across milestones trend panel (REQ-REPORTS-036)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const milestones = [
    { id: 'm0', title: 'Zero', status: 'closed' as const, start: '2026-09-01', end: '2026-09-30', closed_on: '2026-09-30' },
    { id: 'm1', title: 'First', status: 'closed' as const, start: '2026-10-05', end: '2026-10-30', closed_on: '2026-10-30' },
    { id: 'm2', title: 'Second', status: 'active' as const, start: '2026-11-02', end: '2026-11-27', closed_on: null },
  ];
  const trend = [
    { id: 'm0', title: 'Zero', start: '2026-09-01', end: '2026-09-30', closed: 10, points_delivered: 8, on_time: 0.9, rework_rate: 0.1, accuracy: null },
    { id: 'm1', title: 'First', start: '2026-10-05', end: '2026-10-30', closed: 14, points_delivered: 12, on_time: 0.85, rework_rate: 0.15, accuracy: 0.92 },
    { id: 'm2', title: 'Second', start: '2026-11-02', end: '2026-11-27', closed: 18, points_delivered: 15, on_time: 0.95, rework_rate: 0.05, accuracy: 1.05 },
  ];

  await stubReports(page, { projects: ['alpha'] });
  await page.route('**/api/reports/team**', (route) => {
    const ms = new URL(route.request().url()).searchParams.get('milestone') ?? 'm2';
    const unassigned = ms === 'm1' ? { closed: 2, total: 30 } : { closed: 8, total: 30 };
    return route.fulfill({
      json: {
        ...teamBody('alpha', { milestone: ms, trend, unassigned }),
        milestones,
      },
    });
  });

  await ev.step('1. Open `/reports/team?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/team?project=alpha&milestone=m2');
    await expect(page.getByText('8 of 30 closed beads have no assignee, so member numbers undercount.')).toBeVisible();
    const across = page.getByRole('heading', { name: 'Across milestones' }).locator('xpath=ancestor::section[1]');
    await expect(across).toBeVisible();
    const rows = across.locator('tbody tr');
    await expect(rows).toHaveCount(3);
    const m2Row = across.getByRole('row', { name: /Second/ });
    await expect(m2Row).toHaveAttribute('aria-current', 'true');
    const m0Row = across.getByRole('row', { name: /Zero/ });
    await expect(m0Row.locator('td').last()).toHaveText('—');
  });

  await ev.step('2. Switch to `m1` in the scope select', async () => {
    await page.getByRole('combobox', { name: 'Report scope' }).selectOption('milestone:m1');
    await expect(page).toHaveURL((u) => u.pathname === '/reports/team' && u.searchParams.get('milestone') === 'm1');
    await expect(page.getByText(/closed beads have no assignee/)).toHaveCount(0);
  });
});
