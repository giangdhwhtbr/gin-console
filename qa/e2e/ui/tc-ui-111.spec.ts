// TC: TC-UI-111@923c70b7
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-111: No relations', async ({ page, ev }) => {
  // Precondition: epic e-1 in project alpha has 7 tasks that block none of each other.
  const ids = ['t-1', 't-2', 't-3', 't-4', 't-5', 't-6', 't-7'];
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('e-1', { issue_type: 'epic' }), ...ids.map((id) => bead(id, { parent: 'e-1' }))],
  });

  await ev.step('1. Open /beads/alpha/e-1/graph', async () => {
    await page.goto('/beads/alpha/e-1/graph');
    await expect(page.getByText('7 without dependencies')).toBeVisible();
    await expect(page.getByText('No blocking relations between these tasks')).toBeVisible();
    const nodes = page.locator('[data-node]');
    await expect(nodes).toHaveCount(7);
    const rows: number[] = [];
    for (const id of ids) {
      const box = await page.locator(`[data-node="${id}"]`).boundingBox();
      rows.push(Math.round(box!.y));
    }
    const distinct = [...new Set(rows)].sort((a, b) => a - b);
    expect(distinct).toHaveLength(3);
    expect(distinct.map((y) => rows.filter((r) => r === y).length)).toEqual([3, 3, 1]);
  });
});
