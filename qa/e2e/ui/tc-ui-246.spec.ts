// TC: TC-UI-246@7f5fab2d
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';
import { mainNav } from '../support/shell';

test('TC-UI-246: Sections in the sidebar (REQ-UI-129)', async ({ page, ev }) => {
  // Precondition: project a has a report; the window is 1440px wide and the sidebar is expanded.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubReports(page, { projects: ['a'], report: { closed: 41 } });

  await ev.step('1. Open `/reports/delivery?project=a&milestone=m2`', async () => {
    await page.goto('/reports/delivery?project=a&milestone=m2');
    const sections = mainNav(page).getByRole('list', { name: 'Report sections' });
    const links = sections.getByRole('link');
    await expect(links).toHaveCount(5);
    for (const [i, name] of ['Status', 'Team', 'Delivery', 'Velocity', 'Rework'].entries()) {
      await expect(links.nth(i)).toContainText(name);
    }
    await expect(links.nth(2)).toContainText('41 beads closed');
    await expect(links.nth(1)).toContainText('of 4 done');
    await expect(sections.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(links.nth(2)).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Report sections' })).toHaveCount(0);
  });
});
