// TC: TC-MILESTONE-UI-038@63675304
import { test, expect } from '../evidence';
import { bead, entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-038: Every epic in a milestone', async ({ page, ev }) => {
  // Precondition: P's open epics E1 and E2 both have milestone M1 as parent.
  await stubApi(page, {
    milestones: list([entry('M1', { title: 'Alpha launch' })]),
    beads: [
      bead('E1', { title: 'Epic E1', issue_type: 'epic', parent: 'M1', ready: true }),
      bead('E2', { title: 'Epic E2', issue_type: 'epic', parent: 'M1', ready: true }),
    ],
  });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('heading', { name: 'Epics not in a milestone (0)' })).toBeVisible();
    await expect(page.getByText('Every epic is in a milestone.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Epics not in a milestone' })).toHaveCount(0);
  });
});
