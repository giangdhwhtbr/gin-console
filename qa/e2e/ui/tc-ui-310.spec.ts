// TC: TC-UI-310@f18f8e77
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-310: Filter sheet labels are not in capitals', async ({ page, ev }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, { beads: [bead('P-1', { title: 'First bead', labels: ['ui'] })] });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'First bead' })).toBeVisible();
  });

  await ev.step('2. Open the filter sheet', async () => {
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Filter Beads' })).toBeVisible();
  });

  await ev.step('3. Read the computed `text-transform` of each section label', async () => {
    const dialog = page.getByRole('dialog', { name: 'Filter Beads' });
    for (const name of ['Status', 'Priority', 'Labels']) {
      const label = dialog.getByText(name, { exact: true });
      await expect(label).toBeVisible();
      await expect(label).not.toHaveCSS('text-transform', 'uppercase');
      await expect(label).toHaveCSS('text-transform', 'none');
    }
  });
});
