// TC: TC-REPORTS-099@6e7a5003
import { test, expect } from '../evidence';
import { bead, beadDetail, stubBeadDetails } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-099: Bugs section figures, weeks and epic rows (REQ-REPORTS-043)', async ({ page, ev }) => {
  // Precondition: alpha has a bugs report with opened 13, closed 11, open_now 25; the window is 1280px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    bugs: { figures: { total: 30, opened: 13, closed: 11, open_now: 25, oldest_open_days: 43, median_close_days: 0.5 } },
  });
  await stubBeadDetails(page, 'alpha', [beadDetail(bead('e-2', { title: 'Checkout', issue_type: 'epic' }))]);
  const panel = page.getByRole('region', { name: 'Bugs', exact: true });

  await ev.step('1. Open `/reports/bugs?project=alpha&days=30`', async () => {
    await page.goto('/reports/bugs?project=alpha&days=30');
    await expect(panel.getByRole('definition')).toHaveText(['13', '11', '25', '43 d', '0.5 d']);
    await expect(panel.getByRole('term')).toHaveText(['Opened', 'Closed', 'Open now', 'Oldest open', 'Median days to close']);
    const weeks = panel.getByRole('region', { name: 'Bugs per week' });
    await expect(weeks.getByRole('listitem', { name: /5 opened, 3 closed/ })).toBeVisible();
    await expect(weeks.getByRole('listitem', { name: /0 opened, 0 closed/ })).toBeVisible();
    await expect(weeks.getByText('Opened', { exact: true })).toBeVisible();
    await expect(weeks.getByText('Closed', { exact: true })).toBeVisible();
    const epics = panel.getByRole('region', { name: 'Bugs by epic' });
    await expect(epics.getByRole('row').last()).toContainText('Source unknown');
    await expect(epics.getByText('62% of the bugs opened in this scope have no source epic')).toBeVisible();
  });

  await ev.step('2. Focus the Opened figure', async () => {
    const opened = panel.getByRole('definition').first();
    await opened.focus();
    await expect(opened).toHaveAttribute('data-hint', /Bugs found later/);
    await expect(page.getByRole('tooltip').filter({ hasText: 'Bugs found later' })).toBeVisible();
  });

  await ev.step('3. Click the title "Checkout" in the "Bugs by epic" table', async () => {
    await panel.getByRole('region', { name: 'Bugs by epic' }).getByRole('link', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/\/beads\/alpha\/e-2$/);
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  });
});
