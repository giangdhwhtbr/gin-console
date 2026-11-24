// TC: TC-UI-152@9161dd49
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-152: Hidden sections are hinted (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: project alpha exists; the section links do not all fit in a 360 px window.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['alpha'] });
  const strip = page.getByRole('navigation', { name: 'Report sections' });

  await ev.step('1. Set the window width to 360 px', async () => {
    await page.setViewportSize({ width: 360, height: 900 });
  });

  await ev.step('2. Open `/reports/status?project=alpha`', async () => {
    await page.goto('/reports/status?project=alpha');
    await expect(strip).toBeVisible();
    await expect(page.getByTestId('tabs-fade-right')).toBeVisible();
    await expect(page.getByTestId('tabs-fade-left')).toHaveCount(0);
  });

  await ev.step('3. Scroll the row of section links to its end', async () => {
    await strip.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(page.getByTestId('tabs-fade-right')).toHaveCount(0);
    await expect(page.getByTestId('tabs-fade-left')).toBeVisible();
  });
});
