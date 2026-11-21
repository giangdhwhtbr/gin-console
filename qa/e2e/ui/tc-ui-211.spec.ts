// TC: TC-UI-211@2a0cc600
import { test, expect } from '../evidence';
import { epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-211: Cycle (REQ-UI-050)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha has tasks a and b, a blocked by b and b blocked by a.
  await stubProject(page, 'alpha', [epicOf('e-1'), taskOf('a', 'e-1', ['b']), taskOf('b', 'e-1', ['a'])]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1');
    await expect(nodeOf(page, 'a')).toBeVisible();
    await expect(nodeOf(page, 'b')).toBeVisible();
    // the page responds: a click selects a node
    await nodeOf(page, 'a').click();
    await expect(page).toHaveURL(/select=a/);
    const warning = page.getByRole('status').filter({ hasText: 'Dependency cycle between' });
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('a');
    await expect(warning).toContainText('b');
  });
});
