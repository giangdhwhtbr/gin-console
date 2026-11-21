// TC: TC-BEADS-056@103eb4bf
import { test, expect } from '../evidence';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-056: Failed pull note (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: A's pull failed 1 minute ago; B's pull is null.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [
    { name: 'A', path: '/tmp/a', pull: pulled(60, { status: 'error', error: 'Merge conflict detected' }) },
    { name: 'B', path: '/tmp/b', pull: null },
  ]);
  const note = 'Pulling Beads of A failed: Merge conflict detected. Run bd dolt pull in /tmp/a.';

  await ev.step('1. Open /my-tasks', async () => {
    await page.goto('/my-tasks');
    await expect(page.getByText(note)).toHaveCount(1);
    await expect(page.getByText(/Pulling Beads of B/)).toHaveCount(0);
  });

  await ev.step('2. Open /beads?project=A', async () => {
    await page.goto('/beads?project=A');
    await expect(page.getByText(note)).toHaveCount(1);
    await expect(page.getByText(/Pulling Beads of B/)).toHaveCount(0);
  });
});
