// TC: TC-UI-142@54182ab8
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-UI-142: Velocity tab (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha on the Delivery tab; the milestones list of alpha has days_per_point 1.4; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, {
    projects: ['alpha'],
    milestones: { ...list([entry('M1')]), days_per_point: { value: 1.4, measured_epics: 6, assumed: false } },
  });
  const milestones = () => stub.calls.filter((u) => u.pathname === '/api/milestones' && u.searchParams.get('project') === 'alpha');

  await ev.step('1. Open `/reports?project=alpha&tab=delivery`', async () => {
    await page.goto('/reports?project=alpha&tab=delivery');
    await expect(page.getByRole('tab', { name: /^Delivery/ })).toHaveAttribute('aria-selected', 'true');
  });

  await ev.step('2. Pick the Velocity tab', async () => {
    await page.getByRole('tab', { name: /^Velocity/ }).click();
    await expect(page).toHaveURL(/tab=velocity/);
    await expect(page.getByRole('tabpanel').getByText('1.4 days per point', { exact: true })).toBeVisible();
    expect(milestones()).toHaveLength(1);
  });
});
