// TC: TC-UI-314@f3af24fa
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const CARNELIAN = 'rgb(180, 35, 24)'; // --type-bug of the light theme

test('TC-UI-314: List row shows data without chips', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await stubApi(page, {
    beads: [bead('b-1', { title: 'Totals differ', issue_type: 'bug', blocked: true, priority: 1, assignee: 'alice', labels: ['area:backend', 'ui'], lane: 'be', comment_count: 2 })],
  });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Totals differ' })).toBeVisible();
  });

  const row = () => page.locator('[role="treeitem"][data-id="b-1"]');

  await ev.step('2. Find the row of `b-1`', async () => {
    await expect(row().locator('[data-type="bug"]')).toHaveText('bug');
    await expect(row().locator('[data-type="bug"]')).toHaveCSS('color', CARNELIAN);
    await expect(row().locator('[data-priority="1"]')).toHaveText('P1');
    await expect(row().getByText('area:backend', { exact: true })).toBeVisible();
    await expect(row().getByText('ui', { exact: true })).toBeVisible();
    await expect(row().getByText('be', { exact: true })).toBeVisible();
    await expect(row().getByRole('img', { name: '2 comments' })).toHaveText('2');
  });

  await ev.step('3. Read the computed border and background of each fact on the row', async () => {
    await expect(row().locator('[data-priority="1"]')).toHaveCSS('font-weight', '600');
    const facts = [
      row().locator('[data-type="bug"]'),
      row().locator('[data-priority="1"]'),
      row().getByText('area:backend', { exact: true }),
      row().getByText('ui', { exact: true }),
      row().getByText('be', { exact: true }),
      row().getByRole('img', { name: '2 comments' }),
    ];
    for (const fact of facts) {
      await expect(fact).toHaveCSS('border-top-width', '0px');
      await expect(fact).toHaveCSS('border-bottom-width', '0px');
      await expect(fact).toHaveCSS('border-left-width', '0px');
      await expect(fact).toHaveCSS('border-right-width', '0px');
      await expect(fact).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
    // the lane is a muted dot before its name
    const dot = row().getByText('be', { exact: true }).locator('xpath=preceding-sibling::span[1]');
    await expect(dot).toHaveCSS('border-radius', /.+/);
    await expect(dot).toHaveClass(/rounded-full/);
  });
});
