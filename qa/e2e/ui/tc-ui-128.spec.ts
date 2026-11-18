// TC: TC-UI-128@e4154c63
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-128: Close the panel on the Dependencies page', async ({ page, ev }) => {
  // Precondition: alpha has epic e-1 with two tasks, one blocked by the other.
  const beads = [
    bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
    bead('t-1', { title: 'Design', parent: 'e-1' }),
    bead('t-2', { title: 'Build', parent: 'e-1', blocked_by: ['t-1'], dependency_count: 1, blocked: true }),
  ];
  await stubApi(page, { projects: ['alpha'], beads });
  // Registered after stubApi, so these answer the bead detail the panel loads.
  await page.route(/\/api\/beads\/alpha\/[^/]+$/, (route) => {
    const id = route.request().url().split('/').pop()!;
    const b = beads.find((x) => x.id === id)!;
    return route.fulfill({ json: { ...b, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] } });
  });
  await page.route(/\/api\/beads\/alpha\/[^/]+\/comments$/, (route) => route.fulfill({ json: [] }));

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /beads/alpha/e-1/graph', async () => {
    await page.goto('/beads/alpha/e-1/graph');
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Epic one' })).toBeVisible();
  });

  await ev.step('3. Choose "Close details" in the panel', async () => {
    await page.getByRole('button', { name: 'Close details' }).click();
    await expect(page).toHaveURL(/select=none/);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Scope' }).getByRole('button', { name: 'Epic one' })).toBeFocused();
    const canvas = (await page.getByTestId('graph-canvas').boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;
    expect(canvas.width).toBeGreaterThan(main.width * 0.9);
  });

  await ev.step('4. Reload the page', async () => {
    await page.reload();
    await expect(page.locator('[data-node]').first()).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
  });
});
