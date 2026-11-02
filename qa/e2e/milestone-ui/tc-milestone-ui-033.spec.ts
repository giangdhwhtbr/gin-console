// TC: TC-MILESTONE-UI-033@2129987a
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-MILESTONE-UI-033: Board view hides the milestone', async ({ page, ev }) => {
  // Precondition: P reports open milestone M1 and open epic A; both unblocked, so bd marks them ready
  // (M1 would land in the Ready column if it were not hidden).
  await stubApi(page, {
    beads: [
      bead('M1', { title: 'Beta readiness', issue_type: 'milestone', ready: true }),
      bead('A', { title: 'Epic Alpha', issue_type: 'epic', ready: true }),
    ],
  });

  await ev.step('1. Open /beads?project=P', async () => {
    await page.goto('/beads?project=P');
    await expect(page.getByRole('navigation', { name: 'View' })).toBeVisible();
  });

  await ev.step('2. Choose the "Board" view', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Board' }).click();
    await expect(page.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    const main = page.getByRole('main');
    await expect(main.getByRole('region', { name: 'Ready' }).getByRole('link', { name: 'Epic Alpha' })).toBeVisible();
    for (const column of ['Backlog', 'Ready', 'In Progress', 'Blocked', 'Done']) {
      await expect(main.getByRole('region', { name: column }).getByText('M1', { exact: true })).toHaveCount(0);
    }
    await expect(main.getByRole('link', { name: 'Beta readiness' })).toHaveCount(0);
  });
});
