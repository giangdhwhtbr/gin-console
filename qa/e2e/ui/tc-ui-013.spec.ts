// TC: TC-UI-013@37cc7c5e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-013: My Tasks with nothing assigned', async ({ page, ev }) => {
  // Preconditions: email giangdhwhtbr@gmail.com; none of A's beads is assigned to it or to giangdhwhtbr.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'giangdhwhtbr@gmail.com'));
  await stubApi(page, { projects: ['A'], beads: [bead('a-1', { assignee: 'alice' }), bead('a-2')] });

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByText('No tasks assigned to giangdhwhtbr@gmail.com')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the Beads page' })).toHaveAttribute('href', '/beads?project=A');
  });
});
