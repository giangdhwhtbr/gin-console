// TC: TC-MILESTONE-UI-035@cd6be028
import { test, expect } from '../evidence';
import { bead, entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-035: Lists only parentless epics', async ({ page, ev }) => {
  // Precondition: P has open epics A (label roadmap) and B without a parent, epic C under milestone M1,
  // epic D under epic A, and a parentless task T.
  await stubApi(page, {
    milestones: list([entry('M1', { title: 'Alpha launch' })]),
    beads: [
      bead('A', { title: 'Epic A', issue_type: 'epic', priority: 1, labels: ['roadmap'], ready: true }),
      bead('B', { title: 'Epic B', issue_type: 'epic', priority: 2, ready: true }),
      bead('C', { title: 'Epic C', issue_type: 'epic', parent: 'M1', ready: true }),
      bead('D', { title: 'Epic D', issue_type: 'epic', parent: 'A', ready: true }),
      bead('T', { title: 'Task T', issue_type: 'task', ready: true }),
    ],
  });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('heading', { name: 'Epics not in a milestone (2)' })).toBeVisible();
    const rows = page.getByRole('list', { name: 'Epics not in a milestone' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveText(/^Ready\s*A\s*Epic A\s*P1\s*roadmap$/);
    await expect(rows.nth(1)).toHaveText(/^Ready\s*B\s*Epic B\s*P2$/);
    await expect(rows.nth(0).getByRole('link', { name: 'Epic A' })).toHaveAttribute('href', '/beads/P/A');
    await expect(rows.nth(1).getByRole('link', { name: 'Epic B' })).toHaveAttribute('href', '/beads/P/B');
  });
});
