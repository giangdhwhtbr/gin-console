// TC: TC-UI-112@3ba5b4e6
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { settled } from '../support/lanes';

test('TC-UI-112: Linked and unlinked (REQ-UI-048)', async ({ page, ev }) => {
  // Precondition: epic e-1 has b blocked by a, and c, d, e, f without blockers that block nothing.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('e-1', { issue_type: 'epic' }),
      bead('a', { parent: 'e-1', dependent_count: 1 }),
      bead('b', { parent: 'e-1', blocked: true, blocked_by: ['a'], dependency_count: 1 }),
      ...['c', 'd', 'e', 'f'].map((id) => bead(id, { parent: 'e-1' })),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=graph&scope=e-1', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1');
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    await settled(page);
    await expect(page.getByText('4 without dependencies')).toBeVisible();
    const pos = async (id: string) => (await page.locator(`[data-node="${id}"]`).boundingBox())!;
    const [a, b, c, d, e, f] = await Promise.all(['a', 'b', 'c', 'd', 'e', 'f'].map(pos));
    expect(b.y).toBeGreaterThan(a.y);
    expect(Math.round(c.y)).toBe(Math.round(d.y));
    expect(Math.round(d.y)).toBe(Math.round(e.y));
    expect(f.y).toBeGreaterThan(c.y);
    expect(c.y).toBeGreaterThan(b.y);
    expect(c.x).toBeLessThan(d.x);
    expect(d.x).toBeLessThan(e.x);
  });
});
