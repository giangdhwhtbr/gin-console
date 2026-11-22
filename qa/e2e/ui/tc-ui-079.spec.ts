// TC: TC-UI-079@572b1e9a
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-079: Open an epic', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    report: {
      closed: 2, reworkRate: 0.5,
      epics: [{ project: 'alpha', id: 'e-1', title: 'Epic one', closed: 2, reopens: 1, bugs: 0, rework_rate: 0.5 }],
    },
  });

  await ev.step('1. Open `/reports?project=alpha&tab=quality`', async () => {
    await page.goto('/reports?project=alpha&tab=quality');
    await expect(page.getByRole('tab', { name: /^Quality/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('link', { name: 'Epic one' })).toBeVisible();
  });

  await ev.step('2. Click the title of epic `e-1`', async () => {
    await page.getByRole('link', { name: 'Epic one' }).click();
    await expect(page).toHaveURL(/\/beads\/alpha\/e-1$/);
  });
});
