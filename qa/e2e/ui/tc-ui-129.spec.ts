// TC: TC-UI-129@16d9056b
import { test, expect } from '../evidence';
import { epicOf, nodeOf, panelOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-129: Escape selects nothing (REQ-UI-052)', async ({ page, ev }) => {
  // Precondition: alpha has epic e-1 with task t-1.
  await stubProject(page, 'alpha', [epicOf('e-1', { title: 'Epic one' }), taskOf('t-1', 'e-1', [], { title: 'Design' })]);

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=graph&scope=e-1');
    await expect(nodeOf(page, 't-1')).toBeVisible();
    await expect(page.locator('[data-node][aria-pressed="true"]')).toHaveCount(0);
    await expect(panelOf(page)).toHaveCount(0);
  });

  await ev.step('3. Click the node of task `t-1`', async () => {
    await nodeOf(page, 't-1').click();
    await expect(page).toHaveURL(/select=t-1/);
    await expect(panelOf(page).getByRole('heading', { name: 'Design' })).toBeVisible();
  });

  await ev.step('4. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/select=none/);
    await expect(panelOf(page)).toHaveCount(0);
  });
});
