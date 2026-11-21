// TC: TC-UI-209@f56cf811
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';
import { stubEpicPage } from '../support/epic';

test('TC-UI-209: Graph tab of an epic (REQ-UI-106)', async ({ page, ev }) => {
  // Precondition: project p has epic e-1 with tasks a and b.
  const beads = [
    bead('e-1', { title: 'Epic one', issue_type: 'epic', status: 'open' }),
    bead('a', { title: 'Task a', parent: 'e-1', ready: true }),
    bead('b', { title: 'Task b', parent: 'e-1', blocked: true, blocked_by: ['a'], dependency_count: 1 }),
  ];
  await stubApi(page, { projects: ['p'], beads });
  await stubDetails(page, beads, 'p');
  await stubEpicPage(page, { project: 'p' });
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads/p/e-1?tab=graph', async () => {
    await page.goto('/beads/p/e-1?tab=graph');
    await expect(page.getByRole('tab', { name: 'Graph' })).toHaveAttribute('aria-selected', 'true');
    const canvas = page.getByTestId('graph-canvas');
    await expect(canvas).toBeVisible();
    // e-1 is the scope: the canvas draws its children
    await expect(canvas.locator('[data-node="a"]')).toBeVisible();
    await expect(canvas.locator('[data-node="b"]')).toBeVisible();
    await expect(canvas.locator('[data-node="e-1"]')).toHaveCount(0);
    // nothing is selected and no panel is open
    await expect(page).not.toHaveURL(/[?&]select=/);
    await expect(canvas.locator('[data-node][aria-pressed="true"], [data-node][aria-selected="true"], [data-node][aria-current="true"]')).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
  });
});
