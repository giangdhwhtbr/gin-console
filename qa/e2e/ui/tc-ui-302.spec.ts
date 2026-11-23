// TC: TC-UI-302@4cf32363
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-302: Type sizes on the Beads page', async ({ page, ev }) => {
  // Preconditions: P reports a task p-1 titled "A row title" last updated on a past date; the window is 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['P'], beads: [bead('p-1', { title: 'A row title', ready: true, updated_at: '2026-01-15T10:00:00Z' })] });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'A row title' })).toBeVisible();
  });

  await ev.step('2. Read the computed `font-size` of the page title, of the title of `p-1`, of the date of its row and of the filter labels', async () => {
    const row = page.locator('[role="treeitem"][data-id="p-1"]');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toHaveCSS('font-size', '28px');
    await expect(row.getByRole('link', { name: 'A row title' })).toHaveCSS('font-size', '14px');
    await expect(row.getByText(/^15 Jan/)).toHaveCSS('font-size', '12px');
    // the filter labels are now the names of the chips in the filter bar
    for (const name of ['Milestone', 'Status', 'Assignee', 'More filters']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCSS('font-size', '13px');
    }
  });
});
