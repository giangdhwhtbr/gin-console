// TC: TC-UI-158@905ab77c
import { test, expect } from '../evidence';
import { E12, stubExample } from '../support/lanes';

test('TC-UI-158: Lanes draw closed tracks without Show closed', async ({ page, ev }) => {
  // Precondition: "Show closed" is off and track 1 of ex-e12 is closed.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    await expect(page).not.toHaveURL(/closed=1/);
    await expect(page.getByRole('switch', { name: /Show closed/ })).not.toBeChecked();
    await expect(page.locator(`[data-node="${E12}.1"]`)).toBeVisible();
  });
});
