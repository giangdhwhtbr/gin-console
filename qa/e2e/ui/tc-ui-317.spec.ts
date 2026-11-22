// TC: TC-UI-317@567a69a7
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-317: Active filter keeps its chip', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { beads: [bead('a-1', { title: 'Open bead' }), bead('a-2', { title: 'Closed bead', status: 'closed', closed_at: '2026-10-09T00:00:00Z' })] });

  await ev.step('1. Open `/beads?project=P&view=list&status=open`', async () => {
    await page.goto('/beads?project=P&view=list&status=open');
    await expect(page.getByRole('link', { name: 'Open bead' })).toBeVisible();
  });

  await ev.step('2. Find the active filter "Open"', async () => {
    // the active filter is a removable chip: a bordered, tinted element with a control that removes the filter
    const remove = page.getByRole('button', { name: /remove.*open/i });
    await expect(remove).toBeVisible();
    const chip = remove.locator('xpath=..');
    await expect(chip).toHaveCSS('border-top-width', '1px');
    await expect(chip).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });
});
