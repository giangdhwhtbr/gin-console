// TC: TC-UI-163@5c2bc634
import { test, expect } from '../evidence';
import { factOf, shown, stubExample, YESTERDAY_10 } from '../support/lanes';

test('TC-UI-163: Idle lane with an expired lease', async ({ page, ev }) => {
  // Precondition: lane infra has track 5 closed and track 6 open, assigned to chi; track 6 has a claim that expired yesterday.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    const infra = page.getByRole('region', { name: 'Lane infra' });
    await expect(infra).toBeVisible();
    await expect(factOf(infra, 'State')).toHaveText('Idle');
    await expect(factOf(infra, 'Held by')).toHaveText('chi');
    await expect(factOf(infra, 'Lease')).toHaveText(`expired ${shown(YESTERDAY_10)}`);
  });
});
