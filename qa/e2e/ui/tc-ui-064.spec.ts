// TC: TC-UI-064@a3985fd8
import { test, expect } from '../evidence';
import { epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-064: State label (REQ-UI-049)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha has a ready task t-1 and a blocked task t-2.
  await stubProject(page, 'alpha', [epicOf('e-1'), taskOf('t-1', 'e-1', [], { ready: true }), taskOf('t-2', 'e-1', ['t-1'])]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1');
    const ready = nodeOf(page, 't-1');
    const blocked = nodeOf(page, 't-2');
    await expect(ready).toBeVisible();
    await expect(ready.locator('[data-state="ready"]')).toHaveText('Ready');
    await expect(ready.locator('[data-state="ready"] svg')).toBeVisible();
    await expect(blocked.locator('[data-state="blocked"]')).toHaveText('Blocked');
    await expect(blocked.locator('[data-state="blocked"] svg')).toBeVisible();
  });
});
