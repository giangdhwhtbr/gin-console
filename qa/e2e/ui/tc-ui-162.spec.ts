// TC: TC-UI-162@aa1ba06f
import { test, expect } from '../evidence';
import { factOf, stubExample } from '../support/lanes';

test('TC-UI-162: Lane waiting for another lane', async ({ page, ev }) => {
  // Precondition: lane qa has one open, unassigned track blocked by an open merge gate for track 2 of be and a closed merge gate for track 3 of fe.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    const qa = page.getByRole('region', { name: 'Lane qa' });
    await expect(qa).toBeVisible();
    await expect(factOf(qa, 'State')).toHaveText('Waiting for be');
    await expect(factOf(qa, 'Held by')).toHaveText('Unclaimed');
    await expect(factOf(qa, 'Tracks')).toHaveText('0/1 closed');
  });
});
