// TC: TC-REPORTS-085@172a851b
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-REPORTS-085: Burn-up chart lines, markers and day hover details (REQ-REPORTS-029)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, {
    projects: ['alpha'],
    status: {
      today: '2026-11-23',
      milestones: [{ id: 'm2', title: 'Checkout v2', status: 'active', start: '2026-11-11', end: '2026-12-02', closed_on: null }],
      milestone: 'm2',
      period: { kickoff: '2026-11-11', working_days: 16, elapsed: 8, days_left: 8 },
      kpis: {
        beads: { done: 15, scope: 35, done_week_ago: 10, scope_week_ago: 32 },
        points: { done: 9.5, scope: 27, at_kickoff: 24, done_week_ago: 6 },
        pace: { pace: 2.0, pace_needed: 2.8, pace_week_ago: 1.8 },
        blocked: { count: 0, oldest_days: null },
        rework: { rate: 0.1, rate_week_ago: 0.1 },
      },
      burnup: [
        { day: '2026-11-11', scope_points: 24, done_points: 0 },
        { day: '2026-11-12', scope_points: 24, done_points: 1 },
        { day: '2026-11-13', scope_points: 24, done_points: 2 },
        { day: '2026-11-16', scope_points: 24, done_points: 4 },
        { day: '2026-11-17', scope_points: 24, done_points: 5 },
        { day: '2026-11-18', scope_points: 27, done_points: 6 },
        { day: '2026-11-19', scope_points: 27, done_points: 7 },
        { day: '2026-11-20', scope_points: 27, done_points: 8 },
        { day: '2026-11-23', scope_points: 27, done_points: 9.5 },
      ],
      changes: { scope_from: 24, scope_to: 27, items: [] },
      epics: [{
        id: 'e-1', title: 'Team checkout', status: 'in_progress', points: 27, person: 'lead', closed_on: null,
        child_counts: { total: 4, closed: 2, in_progress: 1, blocked: 0, ready: 1, deferred: 0, prep_total: 0, prep_closed: 0 },
      }],
    },
  });

  const chart = page.getByRole('img', { name: 'Burn-up: 9.5 of 27 points done; scope 24 → 27 points since kickoff' });

  await ev.step('1. Open `/reports/status?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/status?project=alpha&milestone=m2');
    await expect(page.getByRole('heading', { level: 3, name: 'Burn-up' })).toBeVisible();
    await expect(chart).toBeVisible();
    await expect(chart.locator('text', { hasText: 'Today' })).toBeVisible();
    await expect(chart.locator('text', { hasText: 'End 2 Dec' })).toBeVisible();
    const section = chart.locator('xpath=ancestor::section[1]');
    for (const name of ['Scope', 'Done', 'Needed pace', 'Forecast']) {
      await expect(section.getByText(name, { exact: true })).toBeVisible();
    }
  });

  await ev.step('2. Hover or focus the 18 Nov day on the burn-up chart', async () => {
    const svg = chart.locator('svg').first();
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    // 18 Nov is index 5 of 19 working days (11 Nov .. 7 Dec): scan across the plot to hit 18 Nov tooltip.
    let found = false;
    for (let frac = 0.25; frac <= 0.48; frac += 0.02) {
      await page.mouse.move(box!.x + box!.width * frac, box!.y + box!.height * 0.5);
      if (await page.getByText('Scope 27 points').isVisible() && await page.getByText('Done 6 points').isVisible()) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    await expect(page.getByText('18 Nov', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Scope 27 points')).toBeVisible();
    await expect(page.getByText('Done 6 points')).toBeVisible();
  });
});
