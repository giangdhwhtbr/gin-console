// TC: TC-REPORTS-103@50305df6
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-103: Scope without bugs and no open bugs (REQ-REPORTS-044)', async ({ page, ev }) => {
  // Precondition: alpha has one bug of epic e-1 open since before the period; milestone m3 has not started.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1280, height: 900 });
  const milestones = [
    { id: 'm2', title: 'Second', status: 'active' as const, start: '2026-11-02', end: '2026-11-27', closed_on: null },
    { id: 'm3', title: 'Third', status: 'planned' as const, start: '2026-12-07', end: '2026-12-18', closed_on: null },
  ];
  await stubReports(page, { projects: ['alpha'] });
  await page.route('**/api/reports/team**', (route) =>
    route.fulfill({ json: { ...teamBody('alpha', { periodDays: null, milestone: new URL(route.request().url()).searchParams.get('milestone') ?? 'm2' }), milestones } }),
  );
  const old = { id: 'a-1', title: 'Old crash', priority: 1, assignee: 'ann', age_days: 60, epic: { id: 'e-1', title: 'Epic one' } };
  await page.route('**/api/reports/bugs**', (route) => {
    const url = new URL(route.request().url());
    const notStarted = url.searchParams.get('milestone') === 'm3';
    const figures = { total: 1, opened: 0, closed: 0, open_now: notStarted ? 0 : 1, oldest_open_days: notStarted ? null : 60, median_close_days: null };
    return route.fulfill({
      json: {
        generated_at: '2026-11-25T12:00:00Z', project: 'alpha', today: '2026-11-25',
        milestone: url.searchParams.get('milestone'), days: url.searchParams.has('days') ? Number(url.searchParams.get('days')) : null,
        period: notStarted ? null : { start: '2026-11-18', end: '2026-11-25' }, figures,
        weeks: notStarted ? [] : [{ start: '2026-11-16', opened: 0, closed: 0 }, { start: '2026-11-23', opened: 0, closed: 0 }],
        epics: notStarted ? [] : [{ id: 'e-1', title: 'Epic one', opened: 0, closed: 0, open_now: 1 }],
        open: notStarted ? [] : [old],
      },
    });
  });
  const panel = page.getByRole('region', { name: 'Bugs', exact: true });

  await ev.step('1. Open `/reports/bugs?project=alpha&days=7`', async () => {
    await page.goto('/reports/bugs?project=alpha&days=7');
    await expect(panel.getByRole('region', { name: 'Bugs per week' }).getByText('No bugs in this scope')).toBeVisible();
    const epics = panel.getByRole('region', { name: 'Bugs by epic' });
    await expect(epics.getByRole('row').nth(1)).toContainText('Epic one');
    await expect(epics.getByRole('cell')).toHaveText(['Epic one', '0', '0', '1']);
    await expect(panel.getByRole('region', { name: 'Open bugs' }).getByRole('link', { name: 'Old crash' })).toBeVisible();
  });

  await ev.step('2. Pick the milestone that has not started in the scope select', async () => {
    await page.getByRole('combobox', { name: 'Report scope' }).selectOption('milestone:m3');
    await expect(page).toHaveURL(/milestone=m3/);
    await expect(panel.getByRole('region', { name: 'Bugs per week' }).getByText('No bugs in this scope')).toBeVisible();
    await expect(panel.getByRole('region', { name: 'Bugs by epic' }).getByText('No bugs in this scope')).toBeVisible();
    await expect(panel.getByRole('region', { name: 'Open bugs' }).getByText('No open bugs')).toBeVisible();
  });
});
