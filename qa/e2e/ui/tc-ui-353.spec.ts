// TC: TC-UI-353@124597ec
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-353: More filters without capability and sprint (REQ-UI-145)', async ({ page, ev }) => {
  // Precondition: beads with no capability and no sprint:<name> label; 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1', { labels: ['ui'] }), bead('ex-2', { priority: 1 })] });

  await ev.step('1. Open `/beads?project=example`', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('button', { name: 'More filters' })).toBeVisible();
  });

  await ev.step('2. Click `button "More filters"`', async () => {
    await page.getByRole('button', { name: 'More filters' }).click();
    const menu = page.getByRole('dialog', { name: 'More filters' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('heading')).toHaveText(['Priority', 'Labels', 'Type', 'Kind']);
  });
});
