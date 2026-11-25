// TC: TC-UI-318@2c19f2a9
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const BAR = /rgb\(106, 61, 184\) 3px 0px 0px 0px inset/; // 3px inside the left edge, --identity of the light theme
const WASH = 'rgb(244, 240, 252)'; // --identity-wash of the light theme

test('TC-UI-318: Current place uses the identity colour', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await stubApi(page, {
    beads: [bead('ex-e3', { title: 'Billing exports', issue_type: 'epic' }), bead('ex-e4', { title: 'Mobile push', issue_type: 'epic' })],
  });

  await ev.step('1. Open `/beads?project=P&view=list&bead=ex-e3`', async () => {
    await page.goto('/beads?project=P&view=list&bead=ex-e3');
    await expect(page.getByRole('link', { name: 'Billing exports' })).toBeVisible();
    // the page has no `bead` parameter: a row is selected by a click on it (the id, not the title link)
    await page.locator('[role="treeitem"][data-id="ex-e3"]').getByText('ex-e3', { exact: true }).click();
  });

  const nav = () => page.getByRole('navigation', { name: 'Main' });

  await ev.step('2. Read the sidebar item "Beads"', async () => {
    const current = nav().getByRole('link', { name: 'Beads' });
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(current).toHaveCSS('box-shadow', BAR);
    await expect(current.locator('svg').first()).toHaveCSS('color', 'rgb(106, 61, 184)');
    for (const name of ['My work', 'Milestones', 'Reports']) {
      const other = nav().getByRole('link', { name });
      await expect(other).toHaveCSS('box-shadow', 'none');
      await expect(other.locator('svg').first()).not.toHaveCSS('color', 'rgb(106, 61, 184)');
    }
  });

  await ev.step('3. Read the row of `ex-e3`', async () => {
    const row = page.locator('[role="treeitem"][data-id="ex-e3"]');
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(row).toHaveCSS('background-color', WASH);
    await expect(row).toHaveCSS('box-shadow', BAR);
    const other = page.locator('[role="treeitem"][data-id="ex-e4"]');
    await expect(other).toHaveCSS('box-shadow', 'none');
    await expect(other).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });
});
