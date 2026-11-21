// TC: TC-UI-215@80982777
import { test, expect } from '../evidence';
import { arrowsOf, epicOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-215: Text alternative (REQ-UI-054)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha has tasks a and b, with b blocked by a.
  await stubProject(page, 'alpha', [epicOf('e-1'), taskOf('a', 'e-1'), taskOf('b', 'e-1', ['a'])]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1');
    const list = page.getByRole('list', { name: 'Dependencies' });
    await expect(list).toContainText('b is blocked by a');
    await expect(arrowsOf(page)).toHaveText(['b is blocked by a']);
    // visually hidden
    await expect(list).toHaveClass(/sr-only/);
  });
});
