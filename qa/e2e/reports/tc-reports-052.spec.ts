// TC: TC-REPORTS-052@7774e760
import { test, expect } from '../evidence';
import { entry, list, type MilestoneEntry } from '../support/api';
import { stubReports } from '../support/reports';

const velocity = (v: Record<string, number | null>) => ({ committed_points: null, completed_points: 0, added_points: 0, say_do: null, days_per_point: null, planned_days_per_point: null, accuracy: null, ...v });
const withVelocity = (id: string, o: Partial<MilestoneEntry> & { velocity: unknown }) => ({ ...entry(id, o), velocity: o.velocity }) as MilestoneEntry;

test('TC-REPORTS-052: Milestones with velocity (REQ-REPORTS-018)', async ({ page, ev }) => {
  // Precondition: alpha has closed m1 (start 1 Oct), active m2 (start 3 Nov) and planned m3 without points.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const milestones = list(
    [
      withVelocity('m3', { status: 'planned', start: '2026-12-01', velocity: velocity({}) }),
      withVelocity('m2', { status: 'active', start: '2026-11-03', velocity: velocity({ committed_points: 13, completed_points: 5, added_points: 2, say_do: 0.38, days_per_point: 1.3, planned_days_per_point: 1.4, accuracy: 1.08 }) }),
      withVelocity('m1', { status: 'closed', start: '2026-10-01', velocity: velocity({ committed_points: 10, completed_points: 8, say_do: 0.8, days_per_point: 1.5, planned_days_per_point: 1.2, accuracy: 0.8 }) }),
    ],
    { days_per_point: { value: 1.4, measured_epics: 6, assumed: false } },
  );
  await stubReports(page, { projects: ['alpha'], milestones });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/reports?project=alpha&tab=velocity`', async () => {
    await page.goto('/reports?project=alpha&tab=velocity');
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByText('1.4 days per point')).toBeVisible();
    await expect(panel.getByText('38%').first()).toBeVisible();
    await expect(panel.getByText('1.08').first()).toBeVisible();
    const rows = panel.getByRole('row');
    await expect(rows.filter({ hasText: 'm1' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'm2' })).toHaveCount(1);
    const texts = await rows.allTextContents();
    expect(texts.findIndex((t) => t.startsWith('m1'))).toBeLessThan(texts.findIndex((t) => t.startsWith('m2')));
    await expect(rows.filter({ hasText: 'm3' })).toHaveCount(0);
  });
});
