// TC: TC-UI-288@4c8c1d84
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-288: Partial failure', async ({ page, ev }) => {
  // Preconditions: "All projects" answers with errors holding beta; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha', 'beta'],
    report: {
      closed: 3,
      errors: [{ project: 'beta', error: 'bd failed: database locked' }],
      epics: [{ project: 'alpha', id: 'a-1', title: 'Alpha epic', closed: 3, reopens: 0, bugs: 0, rework_rate: 0 }],
    },
  });
  const warning = () => page.getByRole('alert').filter({ hasText: 'beta: bd failed: database locked' });

  await ev.step('1. Open `/reports?project=all&tab=delivery`', async () => {
    await page.goto('/reports?project=all&tab=delivery');
    await expect(page.getByRole('tab', { name: /^Delivery/ })).toHaveAttribute('aria-selected', 'true');
    await expect(warning()).toBeVisible();
    const warnBox = await warning().boundingBox();
    const tabBox = await page.getByRole('tablist').first().boundingBox();
    expect(warnBox!.y).toBeLessThan(tabBox!.y);
  });

  await ev.step('2. Pick the Quality tab', async () => {
    await page.getByRole('tab', { name: /^Quality/ }).click();
    await expect(page.getByRole('tab', { name: /^Quality/ })).toHaveAttribute('aria-selected', 'true');
    await expect(warning()).toBeVisible();
    await expect(page.locator('#panel-quality')).toContainText('Alpha epic');
  });
});
