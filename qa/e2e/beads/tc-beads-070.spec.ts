// TC: TC-BEADS-070@7f98133e
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-070: No note for another project (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: A's pull failed 10 seconds ago; B's pull ended ok 10 seconds ago.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [
    { name: 'A', path: '/tmp/a', pull: pulled(10, { status: 'error', error: 'Merge conflict detected' }) },
    { name: 'B', path: '/tmp/b', pull: pulled(10) },
  ], [bead('B-1', { assignee: 'qa@example.com' })]);
  const quiet = async () => {
    await expect(page.getByText('Title B-1').first()).toBeVisible();
    await expect(page.getByText(/Pulling Beads|Merge conflict detected/)).toHaveCount(0);
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
