// TC: TC-BEADS-056@103eb4bf
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-056: Failed pull note (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: A's pull failed 1 minute ago; B's pull is null; the Beads list holds one bead assigned to the signed-in user.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [
    { name: 'A', path: '/tmp/a', pull: pulled(60, { status: 'error', error: 'Merge conflict detected' }) },
    { name: 'B', path: '/tmp/b', pull: null },
  ], [bead('A-1', { assignee: 'qa@example.com' })]);
  const expectBelowNote = async () => {
    const listed = page.getByText('Title A-1').first();
    await expect(listed).toBeVisible();
    const noteBox = await page.getByText(note).boundingBox();
    const listBox = await listed.boundingBox();
    expect(listBox!.y).toBeGreaterThan(noteBox!.y);
  };
  const note = 'Pulling Beads of A failed: Merge conflict detected. Run bd dolt pull in /tmp/a.';

  await ev.step('1. Open /my-tasks', async () => {
    await page.goto('/my-tasks');
    await expect(page.getByText(note)).toHaveCount(1);
    await expect(page.getByText(/Pulling Beads of B/)).toHaveCount(0);
    await expectBelowNote();
  });

  await ev.step('2. Open /beads?project=A', async () => {
    await page.goto('/beads?project=A');
    await expect(page.getByText(note)).toHaveCount(1);
    await expect(page.getByText(/Pulling Beads of B/)).toHaveCount(0);
    await expectBelowNote();
  });
});
