// TC: TC-UI-129@11be6506
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-129: Second Escape closes the panel', async ({ page, ev }) => {
  // Precondition: alpha has epic e-1 with tasks t-1 and t-2 (t-2 blocked by t-1).
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
  const panel = page.getByRole('complementary', { name: 'Bead details' });

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /beads/alpha/e-1/graph', async () => {
    await page.goto('/beads/alpha/e-1/graph');
    await expect(panel.getByRole('heading', { name: 'Epic one' })).toBeVisible();
  });

  await ev.step('3. Click the node of task `t-1`', async () => {
    await page.locator('[data-node="t-1"]').click();
    await expect(page).toHaveURL(/select=t-1/);
    await expect(panel.getByRole('heading', { name: 'Design' })).toBeVisible();
  });

  await ev.step('4. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/select=/);
    await expect(panel.getByRole('heading', { name: 'Epic one' })).toBeVisible();
  });

  await ev.step('5. Press Escape again', async () => {
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/select=none/);
    await expect(panel).toHaveCount(0);
  });
});
