// TC: TC-UI-080@2e3c1b73
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-080: Nothing closed', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    report: { closed: 0, reworkRate: null, members: [], epics: [] },
  });

  await ev.step('1. Open `/reports?project=alpha&tab=quality`', async () => {
    await page.goto('/reports?project=alpha&tab=quality');
    await expect(page.getByRole('tab', { name: /^Quality/ })).toHaveAttribute('aria-selected', 'true');
    const panel = page.locator('#panel-quality');
    await expect(panel).toContainText('—');
    await expect(panel.getByText('No data in this period')).toHaveCount(2);
  });
});
