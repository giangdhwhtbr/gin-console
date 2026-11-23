// TC: TC-UI-349@d3dd69a5
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi, type BeadSummary } from '../support/api';

test('TC-UI-349: Remove one filter (REQ-UI-144)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example with status=open&assignee=alice.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1', { assignee: 'alice' }), bead('ex-2', { assignee: 'bob', status: 'in_progress' })] });
  await page.goto('/beads?project=example&status=open&assignee=alice');
  await expect(page.getByRole('button', { name: 'Status open', exact: true })).toBeVisible();

  await ev.step('1. Click `button "Remove Status filter"`', async () => {
    await page.getByRole('button', { name: 'Remove Status filter' }).click();
    await expect(page).toHaveURL((u) => !u.searchParams.has('status') && u.searchParams.get('assignee') === 'alice');
    await expect(page.getByRole('button', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Assignee alice/ })).toBeVisible();
  });
});
