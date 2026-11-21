// TC: TC-UI-127@7c525d45
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { panelOf, stubProject } from '../support/graph';

test('TC-UI-127: No panel on the project scope of the Graph view at first (REQ-UI-051)', async ({ page, ev }) => {
  // Precondition: alpha has beads with a dependency between them.
  await stubProject(page, 'alpha', [bead('a-1', { title: 'Design' }), bead('a-2', { title: 'Build', blocked_by: ['a-1'], dependency_count: 1, blocked: true })]);

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/beads?project=alpha&milestone=all&view=graph`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph');
    await expect(page.locator('[data-node="a-1"]')).toBeVisible();
    await expect(page.locator('[data-node="a-2"]')).toBeVisible();
    // No node is selected, no panel, and the graph takes the full width.
    await expect(page.locator('[data-node][aria-pressed="true"]')).toHaveCount(0);
    await expect(panelOf(page)).toHaveCount(0);
    const canvas = (await page.getByTestId('graph-canvas').boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;
    expect(canvas.width).toBeGreaterThan(main.width * 0.9);
  });
});
