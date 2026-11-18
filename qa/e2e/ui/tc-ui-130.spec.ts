// TC: TC-UI-130@1baef260
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-130: No panel on the project scope of the Graph view', async ({ page, ev }) => {
  // Precondition: alpha has epic e1; a second epic e2 depends on it so the project scope draws a graph.
  const beads = [
    bead('e1', { title: 'Epic one', issue_type: 'epic' }),
    bead('e2', { title: 'Epic two', issue_type: 'epic', blocked_by: ['e1'], dependency_count: 1, blocked: true }),
    bead('t-1', { title: 'Design', parent: 'e1' }),
  ];
  await stubApi(page, { projects: ['alpha'], beads });

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /beads?project=alpha&milestone=all&view=graph', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph');
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    await expect(page.locator('[data-node]').first()).toBeVisible();
    await expect(page).not.toHaveURL(/select=/);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
    const canvas = (await page.getByTestId('graph-canvas').boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;
    expect(canvas.width).toBeGreaterThan(main.width * 0.9);
  });
});
