// TC: TC-REPORTS-089@e6f84eb3
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-089: One shared scope kept across sections and normalized in URL (REQ-REPORTS-033)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const alphaMilestones = [
    { id: 'm1', title: 'First', status: 'closed' as const, start: '2026-10-05', end: '2026-10-30', closed_on: '2026-10-30' },
    { id: 'm2', title: 'Second', status: 'active' as const, start: '2026-11-02', end: '2026-11-27', closed_on: null },
  ];
  const stub = await stubReports(page, { projects: ['alpha', 'beta'] });
  await page.route('**/api/reports/team**', (route) => {
    const url = new URL(route.request().url());
    const project = url.searchParams.get('project') ?? 'alpha';
    const days = url.searchParams.get('days');
    const ms = url.searchParams.get('milestone');
    if (project === 'beta') {
      return route.fulfill({
        json: { ...teamBody('beta', { periodDays: days ? Number(days) : 30 }), milestones: [], milestone: null },
      });
    }
    return route.fulfill({
      json: {
        ...teamBody('alpha', days ? { periodDays: Number(days) } : { milestone: ms ?? 'm2' }),
        milestones: alphaMilestones,
      },
    });
  });

  const scope = page.getByRole('combobox', { name: 'Report scope' });

  await ev.step('1. Open `/reports/delivery?project=alpha&days=7&milestone=m1&sprint=s7`', async () => {
    await page.goto('/reports/delivery?project=alpha&days=7&milestone=m1&sprint=s7');
    await expect(page).toHaveURL((u) =>
      u.pathname === '/reports/delivery' &&
      u.searchParams.get('project') === 'alpha' &&
      u.searchParams.get('milestone') === 'm1' &&
      !u.searchParams.has('days') &&
      !u.searchParams.has('sprint'),
    );
  });

  await ev.step('2. Open the Team section', async () => {
    await page.getByRole('link', { name: 'Team' }).first().click();
    await expect(page).toHaveURL((u) =>
      u.pathname === '/reports/team' &&
      u.searchParams.get('project') === 'alpha' &&
      u.searchParams.get('milestone') === 'm1',
    );
  });

  await ev.step('3. Pick "Last 7 days" in the scope select', async () => {
    const before = await page.evaluate(() => window.history.length);
    await scope.selectOption('days:7');
    await expect(page).toHaveURL((u) =>
      u.pathname === '/reports/team' &&
      u.searchParams.get('project') === 'alpha' &&
      u.searchParams.get('days') === '7' &&
      !u.searchParams.has('milestone'),
    );
    expect(await page.evaluate(() => window.history.length)).toBeGreaterThan(before);
  });

  await ev.step('4. Open `/reports/team?project=alpha&milestone=m2&member=ann&status=closed` and pick `m1` in the scope select', async () => {
    await page.goto('/reports/team?project=alpha&milestone=m2&member=ann&status=closed');
    await expect(scope).toHaveValue('milestone:m2');
    await scope.selectOption('milestone:m1');
    await expect(page).toHaveURL((u) =>
      u.pathname === '/reports/team' &&
      u.searchParams.get('project') === 'alpha' &&
      u.searchParams.get('milestone') === 'm1' &&
      !u.searchParams.has('member') &&
      !u.searchParams.has('status'),
    );
  });

  await ev.step('5. Open `/reports/team?project=beta`', async () => {
    await page.goto('/reports/team?project=beta');
    await expect(page).toHaveURL((u) =>
      u.pathname === '/reports/team' &&
      u.searchParams.get('project') === 'beta' &&
      u.searchParams.get('days') === '30' &&
      !u.searchParams.has('milestone'),
    );
    await expect(scope.locator('option')).toHaveText(['Last 7 days', 'Last 30 days', 'Last 90 days']);
  });

  await ev.step('6. Open `/reports/bugs?project=alpha&days=7`', async () => {
    await page.goto('/reports/bugs?project=alpha&days=7');
    await expect(page.getByRole('link', { name: /^Bugs/ })).toHaveAttribute('aria-current', 'page');
    await expect(scope).toHaveValue('days:7');
    await expect.poll(() => stub.calls.some((u) => u.pathname === '/api/reports/bugs' && u.searchParams.get('project') === 'alpha' && u.searchParams.get('days') === '7')).toBe(true);
  });
});
