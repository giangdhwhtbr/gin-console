// TC: TC-UI-097@9ca8e921
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-097: No separate entry', async ({ page, ev }) => {
  // Precondition: project p with open beads.
  await stubApi(page, { projects: ['p'], beads: [bead('p-1', { ready: true }), bead('p-2', { ready: true })] });

  await ev.step('1. Open `/beads?project=p`', async () => {
    await page.goto('/beads?project=p');
    await expect(page.getByRole('link', { name: /p-1/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dependencies' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Graph' })).toBeVisible();
  });
});
