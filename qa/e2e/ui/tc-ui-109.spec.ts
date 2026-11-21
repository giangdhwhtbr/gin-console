// TC: TC-UI-109@09427059
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { settled } from '../support/lanes';

test('TC-UI-109: Diamond (REQ-UI-048)', async ({ page, ev }) => {
  // Precondition: Epic e-1 in project alpha has tasks a, b, c and d, where b and c are blocked by a and d is blocked by b and c.
  const task = (id: string, blockedBy: string[] = []) =>
    bead(id, { parent: 'e-1', blocked_by: blockedBy, blocked: blockedBy.length > 0 });
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('e-1', { issue_type: 'epic' }), task('a'), task('b', ['a']), task('c', ['a']), task('d', ['b', 'c'])],
  });
  const node = (id: string) => page.locator(`[data-node="${id}"]`);
  const box = async (id: string) => {
    const b = await node(id).boundingBox();
    if (!b) throw new Error(`no box for ${id}`);
    return b;
  };

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=graph&scope=e-1', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1');
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    await settled(page);
    await expect(node('d')).toBeVisible();
    const [a, b, c, d] = [await box('a'), await box('b'), await box('c'), await box('d')];
    expect(a.y).toBeLessThan(b.y);
    expect(c.y).toBe(b.y);
    expect(b.y).toBeLessThan(d.y);
  });
});
