// TC: TC-UI-352@1750580f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-352: More filters contents (REQ-UI-145)', async ({ page, ev }) => {
  // Precondition: beads with capabilities and sprint:<name> labels; 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  const beads = [
    { ...bead('ex-1', { labels: ['sprint:s1', 'ui'] }), capabilities: ['checkout'] },
    bead('ex-2', { labels: ['sprint:s2'], priority: 1 }),
  ];
  await stubApi(page, { projects: ['example'], beads });

  await ev.step('1. Open `/beads?project=example`', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('button', { name: 'More filters' })).toBeVisible();
  });

  await ev.step('2. Click `button "More filters"`', async () => {
    await page.getByRole('button', { name: 'More filters' }).click();
    const menu = page.getByRole('dialog', { name: 'More filters' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('heading')).toHaveText(['Priority', 'Labels', 'Type', 'Kind', 'Capability', 'Sprint']);
  });
});
