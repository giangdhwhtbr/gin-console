// TC: TC-MILESTONE-UI-037@4fb6e9b3
import { test, expect } from '../evidence';
import { bead, entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-037: Show closed adds closed epics dimmed', async ({ page, ev }) => {
  // Precondition: P has open epic A and closed epic E, both without a parent.
  await stubApi(page, {
    milestones: list([entry('M1', { title: 'Alpha launch' })]),
    beads: [
      bead('A', { title: 'Epic A', issue_type: 'epic', ready: true }),
      bead('E', { title: 'Epic E', issue_type: 'epic', status: 'closed', closed_at: '2026-10-20T00:00:00Z' }),
    ],
  });
  const rows = page.getByRole('list', { name: 'Epics not in a milestone' }).getByRole('listitem');

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('heading', { name: 'Epics not in a milestone (1)' })).toBeVisible();
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0).getByRole('link', { name: 'Epic A' })).toBeVisible();
  });

  await ev.step('2. Check "Show closed"', async () => {
    await page.getByRole('checkbox', { name: 'Show closed' }).check();
    await expect(page.getByRole('heading', { name: 'Epics not in a milestone (2)' })).toBeVisible();
    await expect(rows).toHaveCount(2);
    const a = rows.filter({ has: page.getByRole('link', { name: 'Epic A' }) });
    const e = rows.filter({ has: page.getByRole('link', { name: 'Epic E' }) });
    await expect(a).toBeVisible();
    await expect(e).toBeVisible();
    // Dimmed: closed rows take the muted text colour (UnassignedEpics.tsx), open rows do not.
    await expect(e).toHaveClass(/\btext-muted-foreground\b/);
    await expect(a).not.toHaveClass(/\btext-muted-foreground\b/);
  });
});
