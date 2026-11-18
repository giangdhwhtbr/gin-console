// TC: TC-UI-127@75ae58ad
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-127: No panel on the project page of the Dependencies page', async ({ page, ev }) => {
  // Precondition: alpha has beads with a dependency between them.
  const beads = [bead('a-1', { title: 'Design' }), bead('a-2', { title: 'Build', blocked_by: ['a-1'], dependency_count: 1, blocked: true })];
  await stubApi(page, { projects: ['alpha'], beads });

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /beads/alpha/graph', async () => {
    await page.goto('/beads/alpha/graph');
    await expect(page.locator('[data-node="a-1"]')).toBeVisible();
    await expect(page.locator('[data-node="a-2"]')).toBeVisible();
    // No node is selected, no panel, and the graph takes the full width.
    await expect(page.locator('[data-node][aria-pressed="true"]')).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
    const canvas = (await page.getByTestId('graph-canvas').boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;
    expect(canvas.width).toBeGreaterThan(main.width * 0.9);
  });
});
