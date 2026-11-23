// TC: TC-UI-378@1177e8c6
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';
import { stubEpicPage } from '../support/epic';

// m2 has epic e1 with tasks e1.1 (ready) and e1.2 (blocked by e1.1).
const beads = [
  bead('m2', { issue_type: 'milestone' }),
  bead('e1', { title: 'Epic one', issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
  bead('e1.1', { title: 'Task one', parent: 'e1', milestone: 'm2', ready: true }),
  bead('e1.2', { title: 'Task two', parent: 'e1', milestone: 'm2', blocked: true, blocked_by: ['e1.1'], dependency_count: 1 }),
];
const milestoneOptions = { milestones: [{ id: 'm2', title: 'Title m2', status: 'active' as const, start: '2026-11-02', end: '2026-12-18' }], current: null };

test('TC-UI-378: Going down on a phone', async ({ page, ev }) => {
  // Precondition: the Graph view of milestone m2 at 390px wide.
  await stubApi(page, { projects: ['p'], beads, milestoneOptions });
  await stubDetails(page, beads, 'p');
  await stubEpicPage(page, { project: 'p' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/beads?project=p&milestone=m2&view=graph');
  const node = page.locator('[data-node="e1"]');
  await expect(node).toBeVisible();

  await ev.step('1. Tap the node of epic e1', async () => {
    await node.click();
    await expect(page).toHaveURL(/\/beads\/p\/e1$/);
    await expect(page.getByRole('heading', { name: 'Epic one' })).toBeVisible();
    await page.getByRole('tab', { name: 'Graph' }).click();
    const canvas = page.getByTestId('graph-canvas');
    await expect(canvas.locator('[data-node="e1.1"]')).toBeVisible();
    await expect(canvas.locator('[data-node="e1.2"]')).toBeVisible();
  });
});
