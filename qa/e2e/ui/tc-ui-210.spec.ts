// TC: TC-UI-210@ceadebfe
import { test, expect } from '../evidence';
import { arrowsOf, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';
import { settled } from '../support/lanes';

test('TC-UI-210: Outside blocker (REQ-UI-050)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha has task t-1 blocked by x-9, a task of another epic.
  await stubProject(page, 'alpha', [epicOf('e-1'), epicOf('e-2'), taskOf('t-1', 'e-1', ['x-9']), taskOf('x-9', 'e-2')]);

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1');
    await expect(nodeOf(page, 't-1')).toBeVisible();
    await settled(page);
    const outside = nodeOf(page, 'x-9');
    await expect(outside).toBeVisible();
    // dimmed with a dashed border
    await expect(outside).toHaveAttribute('data-external', 'true');
    await expect(outside).toHaveClass(/border-dashed/);
    await expect(outside).toHaveClass(/opacity-60/);
    // above t-1, with an arrow from x-9 to t-1
    const [x, t] = [(await outside.boundingBox())!, (await nodeOf(page, 't-1').boundingBox())!];
    expect(x.y).toBeLessThan(t.y);
    await expect(arrowsOf(page)).toHaveText(['t-1 is blocked by x-9']);
  });
});
