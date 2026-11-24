// TC: TC-UI-142@f7f197d0
import { test, expect } from '../evidence';
import { entry, list } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-UI-142: Velocity section (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the Reports page for alpha on the Delivery section; the milestones list of alpha has days_per_point 1.4; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, {
    projects: ['alpha'],
    milestones: { ...list([entry('M1')]), days_per_point: { value: 1.4, measured_epics: 6, assumed: false } },
  });
  const milestones = () => stub.calls.filter((u) => u.pathname === '/api/milestones' && u.searchParams.get('project') === 'alpha');

  await ev.step('1. Open `/reports/delivery?project=alpha`', async () => {
    await page.goto('/reports/delivery?project=alpha');
    await expect(page.getByRole('link', { name: /^Delivery/ })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('2. Open the Velocity section', async () => {
    const velocity = page.getByRole('link', { name: /^Velocity/ });
    await velocity.click();
    await expect(page).toHaveURL(/\/reports\/velocity/);
    await expect(velocity).toContainText('1.4 days per point');
    await expect(page.getByRole('region', { name: 'Velocity' }).getByText('1.4 days per point', { exact: true })).toBeVisible();
    expect(milestones()).toHaveLength(1);
  });
});
