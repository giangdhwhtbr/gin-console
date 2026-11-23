// TC: TC-UI-380@110e62ac
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { panelOf, stubProject } from '../support/graph';

test('TC-UI-380: Graph view panel', async ({ page, ev }) => {
  // Precondition: project p has epic e-1 with task t-1, which has a child t-1.1; the window is 1440px wide.
  await stubProject(page, 'p', [
    bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
    bead('t-1', { title: 'Task one', parent: 'e-1' }),
    bead('t-1.1', { title: 'Child one', parent: 't-1' }),
  ]);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open `/beads?project=p&milestone=all&view=graph&scope=e-1&select=t-1`', async () => {
    await page.goto('/beads?project=p&milestone=all&view=graph&scope=e-1&select=t-1');
    await expect(page.locator('[data-node="t-1"]')).toBeVisible();
  });

  await ev.step('2. Look at the details panel of `t-1`', async () => {
    const panel = panelOf(page);
    await expect(panel.getByRole('heading', { name: 'Task one' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Show children' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'View in graph' })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'View in graph' })).toHaveCount(0);
  });
});
