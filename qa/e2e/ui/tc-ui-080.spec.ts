// TC: TC-UI-080@74227579
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-080: Nothing closed', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    report: { closed: 0, reworkRate: null, members: [], epics: [] },
  });

  await ev.step('1. Open `/reports/rework?project=alpha`', async () => {
    await page.goto('/reports/rework?project=alpha');
    await expect(page.getByRole('link', { name: /^Rework/ })).toHaveAttribute('aria-current', 'page');
    const panel = page.getByRole('region', { name: 'Rework', exact: true });
    await expect(panel).toContainText('—');
    await expect(panel.getByText('No data in this scope')).toHaveCount(2);
  });
});
