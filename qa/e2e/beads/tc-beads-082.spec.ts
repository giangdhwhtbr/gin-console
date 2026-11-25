// TC: TC-BEADS-082@7e0eb0c3
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';

test('TC-BEADS-082: Next command of a task by state and assignee (REQ-BEADS-025)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; project P has tasks t-1 to t-6 (test data).
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const beads = [
    bead('t-1', { title: 'Ready unclaimed', ready: true }),
    bead('t-2', { title: 'Ready mine', ready: true, assignee: 'ann' }),
    bead('t-3', { title: 'Active mine', status: 'in_progress', assignee: 'ANN@other.com' }),
    bead('t-4', { title: 'Active of bob', status: 'in_progress', assignee: 'bob' }),
    bead('t-5', { title: 'Ready of bob', ready: true, assignee: 'bob' }),
    bead('t-6', { title: 'Active but blocked', status: 'in_progress', assignee: 'ann', blocked: true, blocked_by: ['t-1'] }),
  ];
  await stubApi(page, { beads });
  await stubBeadDetails(page, 'P', beads.map((b) => beadDetail(b)));

  const open = async (id: string, title: string) => {
    await page.goto(`/beads/P/${id}`);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  };
  const next = page.getByText('Next', { exact: true });
  const shows = async (id: string, title: string, command: string | null) => {
    await open(id, title);
    if (command === null) await expect(next).toHaveCount(0);
    else {
      await expect(next).toBeVisible();
      await expect(page.getByText(command, { exact: true })).toBeVisible();
    }
  };

  await ev.step('1. Open `/beads/P/t-1`', () => shows('t-1', 'Ready unclaimed', 'gin task update t-1 --claim'));
  await ev.step('2. Open `/beads/P/t-2`', () => shows('t-2', 'Ready mine', 'gin task update t-2 --claim'));
  await ev.step('3. Open `/beads/P/t-3`', () => shows('t-3', 'Active mine', '/gin:execute t-3'));
  await ev.step('4. Open `/beads/P/t-4`', () => shows('t-4', 'Active of bob', null));
  await ev.step('5. Open `/beads/P/t-5`', () => shows('t-5', 'Ready of bob', null));
  await ev.step('6. Open `/beads/P/t-6`', () => shows('t-6', 'Active but blocked', null));
});
