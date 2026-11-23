// TC: TC-UI-016@f5dbbc88
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-016: The beads request of the project fails in My Tasks', async ({ page, ev }) => {
  // Preconditions: A is current; GET /api/beads?project=A responds 500 with an error message.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['A'], beads: () => ({ status: 500, body: { error: 'bd exploded' } }) });

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByText('A could not be loaded')).toBeVisible();
    await expect(page.getByText('bd exploded')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^a-/ })).toHaveCount(0);
  });
});
