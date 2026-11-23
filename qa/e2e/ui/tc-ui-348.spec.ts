// TC: TC-UI-348@752cfd34
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi, type BeadSummary } from '../support/api';

test('TC-UI-348: Chip with values opens its menu (REQ-UI-144)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example at 1440px wide with status=open,in_progress.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1'), bead('ex-2', { status: 'in_progress' }), bead('ex-3', { status: 'blocked' })] });
  await page.goto('/beads?project=example&status=open,in_progress');
  const chip = page.getByRole('button', { name: 'Status open, in_progress', exact: true });

  await ev.step('1. Click the body of the Status chip', async () => {
    await expect(chip).toBeVisible();
    await expect(chip.locator('xpath=..')).toHaveClass(/bg-identity-wash/);
    await expect(page.getByRole('button', { name: 'Remove Status filter' })).toBeVisible();
    await chip.click();
    const menu = page.getByRole('dialog', { name: 'Status' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('checkbox', { name: 'open', exact: true })).toBeChecked();
    await expect(menu.getByRole('checkbox', { name: 'in_progress' })).toBeChecked();
    await expect(menu.getByRole('checkbox', { name: 'blocked' })).not.toBeChecked();
  });
});
