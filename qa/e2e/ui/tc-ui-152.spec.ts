// TC: TC-UI-152@a67c91d2
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-152: Hidden tabs are hinted (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: project alpha exists; the Quality tab does not fit in a 360 px window.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Set the window width to 360 px', async () => {
    await page.setViewportSize({ width: 360, height: 900 });
  });

  await ev.step('2. Open `/reports?project=alpha&tab=team`', async () => {
    await page.goto('/reports?project=alpha&tab=team');
    await expect(page.getByRole('tablist', { name: 'Report' })).toBeVisible();
    await expect(page.getByTestId('tabs-fade-right')).toBeVisible();
    await expect(page.getByTestId('tabs-fade-left')).toHaveCount(0);
  });

  await ev.step('3. Scroll the tab list to its end', async () => {
    await page.getByRole('tablist', { name: 'Report' }).evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(page.getByTestId('tabs-fade-right')).toHaveCount(0);
    await expect(page.getByTestId('tabs-fade-left')).toBeVisible();
  });
});
