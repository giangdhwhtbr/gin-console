// TC: TC-UI-174@c2effff5
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { gate, stubExample } from '../support/lanes';

test('TC-UI-174: Merge gates not on the List, Board and Focus views', async ({ page, ev }) => {
  // Precondition: an open merge gate without blockers and an open task without blockers.
  await stubExample(page, [
    bead('ex-t1', { title: 'Write the release notes', priority: 1, ready: true }),
    gate('ex-g1', 1, null, null, { title: 'external: .planning/plans/p.md#1' }),
  ]);
  await page.setViewportSize({ width: 1440, height: 900 });
  const task = (scope: ReturnType<typeof page.locator>) => scope.getByText('Write the release notes');

  await ev.step('1. Open the Board view', async () => {
    await page.goto('/beads?project=example&milestone=all&view=board');
    await expect(task(page.locator('[data-card]'))).toHaveCount(1);
    await expect(page.locator('[data-card]')).toHaveCount(1);
    await expect(page.getByText('external: .planning/plans/p.md#1')).toHaveCount(0);
    await expect(page.getByText('ex-g1', { exact: true })).toHaveCount(0);
  });

  await ev.step('2. Open the List view', async () => {
    await page.goto('/beads?project=example&milestone=all&view=list');
    await expect(page.locator('[data-id="ex-t1"]')).toBeVisible();
    await expect(page.locator('[data-id="ex-g1"]')).toHaveCount(0);
    await expect(page.getByText('external: .planning/plans/p.md#1')).toHaveCount(0);
  });

  await ev.step('3. Open the Focus view', async () => {
    await page.goto('/beads?project=example&milestone=all&view=focus');
    await expect(task(page.locator('[data-card]'))).toHaveCount(1);
    await expect(page.locator('[data-card]')).toHaveCount(1);
    await expect(page.getByText('external: .planning/plans/p.md#1')).toHaveCount(0);
    await expect(page.getByText('ex-g1', { exact: true })).toHaveCount(0);
  });
});
