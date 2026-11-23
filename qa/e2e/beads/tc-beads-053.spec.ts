// TC: TC-BEADS-053@c8c6f8fc
import { test, expect } from '../evidence';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-053: Pulled (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: project A's pull ended ok 2 minutes ago.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [{ name: 'A', path: '/tmp/a', pull: pulled(120) }]);
  const quiet = async () => {
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByText(/Pulling Beads/)).toHaveCount(0);
    await expect(page.getByText(/pulled|2 minutes ago|no Dolt remote|pull failed/)).toHaveCount(0);
  };

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await quiet();
  });

  await ev.step('2. Open /beads?project=A', async () => {
    await page.goto('/beads?project=A');
    await quiet();
  });
});
