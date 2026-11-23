// TC: TC-UI-362@e7c78344
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-362: Double click a Graph node', async ({ page, ev }) => {
  // Precondition: the Graph view of milestone m2 at 1440px wide; epic e1 has tasks.
  const beads = [
    bead('m2', { issue_type: 'milestone' }),
    bead('e1', { title: 'Epic one', issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
    bead('e1.1', { title: 'Task one', parent: 'e1', milestone: 'm2', ready: true }),
  ];
  await stubApi(page, { projects: ['p'], beads, milestoneOptions: { milestones: [{ id: 'm2', title: 'Title m2', status: 'active', start: '2026-11-02', end: '2026-12-18' }], current: null } });
  await stubDetails(page, beads, 'p');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/beads?project=p&milestone=m2&view=graph');
  const node = page.locator('[data-node="e1"]');
  await expect(node).toBeVisible();

  await ev.step('1. Double-click the node of e1', async () => {
    await node.dblclick();
    await expect(page).toHaveURL(/\/beads\/p\/e1$/);
    await expect(page.getByRole('heading', { name: 'Epic one' })).toBeVisible();
  });
});
