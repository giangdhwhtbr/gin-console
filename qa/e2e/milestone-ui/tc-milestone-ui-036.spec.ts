// TC: TC-MILESTONE-UI-036@e7f9797f
import { test, expect } from '../evidence';
import { bead, entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-036: Rows ordered by priority then id', async ({ page, ev }) => {
  // Precondition: P has parentless open epics p-b (P1), p-a (P1), and p-c (P0); bd answers them in that order.
  await stubApi(page, {
    milestones: list([entry('M1', { title: 'Alpha launch' })]),
    beads: [
      bead('p-b', { title: 'Epic p-b', issue_type: 'epic', priority: 1, ready: true }),
      bead('p-a', { title: 'Epic p-a', issue_type: 'epic', priority: 1, ready: true }),
      bead('p-c', { title: 'Epic p-c', issue_type: 'epic', priority: 0, ready: true }),
    ],
  });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    const rows = page.getByRole('list', { name: 'Epics not in a milestone' }).getByRole('listitem');
    await expect(rows.getByRole('link')).toHaveText(['Epic p-c', 'Epic p-a', 'Epic p-b']);
  });
});
