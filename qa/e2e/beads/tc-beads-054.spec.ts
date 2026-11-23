// TC: TC-BEADS-054@83f672e9
import { test, expect } from '../evidence';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-054: No remote shows no note (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: project B's pull status is no_remote.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [{ name: 'B', path: '/tmp/b', pull: pulled(60, { status: 'no_remote' }) }]);
  const quiet = async () => {
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByText(/Pulling Beads|no Dolt remote|pull failed/)).toHaveCount(0);
  };

  await ev.step('1. Open /my-tasks?project=B', async () => {
    await page.goto('/my-tasks?project=B');
    await quiet();
  });

  await ev.step('2. Open /beads?project=B', async () => {
    await page.goto('/beads?project=B');
    await quiet();
  });
});
