// TC: TC-UI-170@cf73ebfe
import { test, expect } from '../evidence';
import { shown, stubExample, TOMORROW_16 } from '../support/lanes';

test('TC-UI-170: Screen reader list of lanes', async ({ page, ev }) => {
  // Precondition: lane be is running, held by ann, with a lease and 1/2 tracks closed; track 4 of qa waits for track 2 of be through an open merge gate.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    const list = page.getByRole('list', { name: 'Lanes' });
    await expect(list).toContainText(`be: Running, held by ann, lease until ${shown(TOMORROW_16)}, 1/2 closed`);
    await expect(list.getByRole('listitem').filter({ hasText: /^qa #4 waits for be #2: merge pending$/ })).toHaveCount(1);
    await expect(list.getByRole('listitem').filter({ hasText: /^qa #4 waits for fe #3: merged$/ })).toHaveCount(1);
  });
});
