// TC: TC-UI-110@b8263926
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-110: Order inside a layer', async ({ page, ev }) => {
  // Precondition: Epic e-1 in project alpha has tasks a and b without blockers, x blocked by b and y blocked by a, and a is placed before b.
  const task = (id: string, blockedBy: string[] = []) =>
    bead(id, { parent: 'e-1', blocked_by: blockedBy, blocked: blockedBy.length > 0 });
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('e-1', { issue_type: 'epic' }), task('a'), task('b'), task('x', ['b']), task('y', ['a'])],
  });
  const node = (id: string) => page.locator(`[data-node="${id}"]`);
  const box = async (id: string) => {
    const b = await node(id).boundingBox();
    if (!b) throw new Error(`no box for ${id}`);
    return b;
  };

  await ev.step('1. Open /beads/alpha/e-1/graph', async () => {
    await page.goto('/beads/alpha/e-1/graph');
    await expect(node('y')).toBeVisible();
    const [a, b, x, y] = [await box('a'), await box('b'), await box('x'), await box('y')];
    expect(a.y).toBe(b.y);
    expect(x.y).toBe(y.y);
    expect(a.y).toBeLessThan(x.y);
    expect(a.x).toBeLessThan(b.x);
    expect(y.x).toBeLessThan(x.x);
  });
});
