// TC: TC-REPORTS-100@c7b5c8cf
import { test, expect } from '../evidence';
import { bead, beadDetail, stubBeadDetails } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-100: Open bugs table and show all (REQ-REPORTS-043)', async ({ page, ev }) => {
  // Precondition: alpha has a bugs report with 25 open bugs, the first of epic e-2 and the last without priority, assignee and epic.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 1280, height: 900 });
  const open = Array.from({ length: 25 }, (_, i) => ({
    id: `b-${i + 1}`, title: `Bug number ${i + 1}`, age_days: 40 - i,
    priority: i === 24 ? null : 1, assignee: i === 24 ? null : 'ann',
    epic: i === 24 ? null : { id: 'e-2', title: 'Checkout' },
  }));
  await stubReports(page, {
    projects: ['alpha'],
    bugs: { figures: { total: 40, opened: 13, closed: 11, open_now: 25, oldest_open_days: 40, median_close_days: 0.5 }, open },
  });
  await stubBeadDetails(page, 'alpha', [beadDetail(bead('b-1', { title: 'Bug number 1', issue_type: 'bug' }))]);
  const section = page.getByRole('region', { name: 'Open bugs' });
  const rows = section.getByRole('row');

  await ev.step('1. Open `/reports/bugs?project=alpha&days=30`', async () => {
    await page.goto('/reports/bugs?project=alpha&days=30');
    await expect(section.getByText('All open bugs of alpha, whatever the scope')).toBeVisible();
    await expect(section.getByRole('columnheader')).toHaveText(['Bug', 'Priority', 'Assignee', 'Age', 'Epic']);
    await expect(rows).toHaveCount(21); // the header row and 20 bugs
    const first = rows.nth(1);
    await expect(first).toContainText('Bug number 1');
    await expect(first).toContainText('b-1');
    await expect(first).toContainText('P1');
    await expect(first).toContainText('ann');
    await expect(first).toContainText('40 d');
    await expect(first).toContainText('Checkout');
    await expect(section.getByRole('button', { name: 'Show all 25' })).toBeVisible();
  });

  await ev.step('2. Press "Show all 25" under "Open bugs"', async () => {
    await section.getByRole('button', { name: 'Show all 25' }).click();
    await expect(rows).toHaveCount(26);
    await expect(section.getByRole('button', { name: /^Show all/ })).toHaveCount(0);
    const last = rows.last();
    await expect(last).toContainText('Bug number 25');
    await expect(last).toContainText('Unassigned');
    await expect(last).toContainText('Source unknown');
  });

  await ev.step('3. Click the title of the first open bug', async () => {
    await section.getByRole('link', { name: 'Bug number 1', exact: true }).click();
    await expect(page).toHaveURL(/\/beads\/alpha\/b-1$/);
  });
});
