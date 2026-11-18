// TC: TC-UI-108@5d5ae9e4
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-108: Chain', async ({ page, ev }) => {
  // Precondition: Epic e-1 in project alpha has tasks a, b, c, where b is blocked by a and c by b.
  const task = (id: string, blockedBy: string[] = []) =>
    bead(id, { parent: 'e-1', blocked_by: blockedBy, blocked: blockedBy.length > 0 });
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('e-1', { issue_type: 'epic' }), task('a'), task('b', ['a']), task('c', ['b'])],
  });
  const node = (id: string) => page.locator(`[data-node="${id}"]`);
  const box = async (id: string) => {
    const b = await node(id).boundingBox();
    if (!b) throw new Error(`no box for ${id}`);
    return b;
  };

  await ev.step('1. Open /beads/alpha/e-1/graph', async () => {
    await page.goto('/beads/alpha/e-1/graph');
    await expect(node('a')).toBeVisible();
    await expect(node('c')).toBeVisible();
    const [a, b, c] = [await box('a'), await box('b'), await box('c')];
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
    const list = page.getByRole('list', { name: 'Dependencies' });
    await expect(list.getByRole('listitem')).toHaveText(['b is blocked by a', 'c is blocked by b']);
  });
});
