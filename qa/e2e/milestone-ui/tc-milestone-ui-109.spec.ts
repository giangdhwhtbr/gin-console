// TC: TC-MILESTONE-UI-109@718f85be
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { reportBody, teamBody } from '../support/reports';

test('TC-MILESTONE-UI-109: Closed on time and closed late', async ({ page, ev }) => {
  // Precondition: m3 ends Fri 27 Nov 2026 and closed on 27 Nov; m4 has the same end and closed Tue 1 Dec.
  const milestones = [
    { id: 'm3', title: 'Third', status: 'closed', start: '2026-11-02', end: '2026-11-27', closed_on: '2026-11-27' },
    { id: 'm4', title: 'Fourth', status: 'closed', start: '2026-11-02', end: '2026-11-27', closed_on: '2026-12-01' },
  ];
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['P'] });
  await page.route('**/api/reports/team**', (route) => {
    const id = new URL(route.request().url()).searchParams.get('milestone') ?? 'm3';
    return route.fulfill({
      json: { ...teamBody('P'), today: '2026-12-02', milestones, milestone: id, team: null },
    });
  });
  await page.route(/\/api\/reports\?/, (route) => route.fulfill({ json: reportBody('P') }));

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open `/reports?project=P&tab=team&milestone=m3`', async () => {
    await page.goto('/reports?project=P&tab=team&milestone=m3');
    await expect(page.getByText('Closed, on time', { exact: true })).toBeVisible();
  });

  await ev.step('3. Open `/reports?project=P&tab=team&milestone=m4`', async () => {
    await page.goto('/reports?project=P&tab=team&milestone=m4');
    await expect(page.getByText('Closed, 2 d late', { exact: true })).toBeVisible();
  });
});
