// TC: TC-UI-172@518212c7
import { test, expect } from '../evidence';
import { E12, factOf, shown, stubExample, TOMORROW_16 } from '../support/lanes';

test('TC-UI-172: Lane facts on a bead page', async ({ page, ev }) => {
  // Precondition: track 2 has track {plan .planning/plans/2026-11-20-shop.md, number 2}, lane be and a claim expiring tomorrow at 16:00.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads/example/ex-e12.2', async () => {
    await page.goto(`/beads/example/${E12}.2`);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Track 2' })).toBeVisible();
    await expect(factOf(main, 'Lane')).toHaveText('be');
    await expect(factOf(main, 'Track')).toHaveText('#2 2026-11-20-shop.md');
    await expect(factOf(main, 'Lease')).toHaveText(`until ${shown(TOMORROW_16)}`);
  });
});
