// TC: TC-UI-161@06bc28c6
import { test, expect } from '../evidence';
import { factOf, shown, stubExample, TOMORROW_16 } from '../support/lanes';

test('TC-UI-161: Running lane with a lease', async ({ page, ev }) => {
  // Precondition: lane be has track 1 closed and track 2 in progress, both assigned to ann; track 2 has a claim expiring tomorrow at 16:00.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    const be = page.getByRole('region', { name: 'Lane be' });
    await expect(be).toBeVisible();
    await expect(factOf(be, 'State')).toHaveText('Running');
    await expect(factOf(be, 'Held by')).toHaveText('ann');
    await expect(factOf(be, 'Lease')).toHaveText(`until ${shown(TOMORROW_16)}`);
    expect(shown(TOMORROW_16)).toMatch(/ 16:00$/);
    await expect(factOf(be, 'Tracks').locator('[data-strand="1/2"]')).toHaveText('1/2');
  });
});
