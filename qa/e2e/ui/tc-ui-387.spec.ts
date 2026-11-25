// TC: TC-UI-387@9b7550e0
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-387: No next command on a closed task or an epic panel (REQ-UI-151)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; project P has closed task t-1 and open epic e-2.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const closed = bead('t-1', { title: 'Done task', status: 'closed', assignee: 'ann', closed_at: '2026-10-11T00:00:00Z' });
  const epic = bead('e-2', { title: 'Open epic', issue_type: 'epic', ready: true });
  await stubApi(page, { beads: [closed, epic] });
  await stubDetails(page, [closed, epic], 'P');
  const next = page.getByText('Next', { exact: true });

  await ev.step('1. Open `/beads/P/t-1`', async () => {
    await page.goto('/beads/P/t-1');
    await expect(page.getByRole('heading', { name: 'Done task', level: 1 })).toBeVisible();
    await expect(next).toHaveCount(0);
  });
  await ev.step('2. Open `/beads?project=P` and select the epic `e-2` in the list', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/beads?project=P&view=list&milestone=all');
    await page.getByRole('treeitem', { name: /^e-2 / }).click();
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Open epic' })).toBeVisible();
    await expect(panel.getByText('Next', { exact: true })).toHaveCount(0);
  });
});
