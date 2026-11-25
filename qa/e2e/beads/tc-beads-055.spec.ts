// TC: TC-BEADS-055@dca165b7
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { pulled, stubProjectPulls } from '../support/pull';
import { projectList, sidebarSwitcher } from '../support/shell';

test('TC-BEADS-055: Failed pull note follows the project switcher (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: A's pull failed 1 minute ago; B's pull is null; the Beads lists are stubbed.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [
    { name: 'A', path: '/tmp/a', pull: pulled(60, { status: 'error', error: 'Merge conflict detected' }) },
    { name: 'B', path: '/tmp/b', pull: null },
  ], [bead('A-1', { ready: true, assignee: 'qa@example.com' })]);
  const note = 'Pulling Beads of A failed: Merge conflict detected. Run bd dolt pull in /tmp/a.';

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByText(note)).toHaveCount(1);
  });

  await ev.step('2. Choose project B in the project switcher', async () => {
    await sidebarSwitcher(page, 'A').click();
    await projectList(page).getByRole('button', { name: 'B', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/my-tasks?project=B');
    await expect(page.getByText(/Pulling Beads/)).toHaveCount(0);
  });
});
