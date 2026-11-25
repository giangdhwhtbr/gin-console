// TC: TC-BEADS-084@28249c6a
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';

test('TC-BEADS-084: No next command for a merge gate or a milestone (REQ-BEADS-025)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; project P has merge gate g-1 (waits for track 2 of plan p) and milestone m-1.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const gate = bead('g-1', { title: 'external: p/2', ready: true, waits_for: { plan: 'p', number: 2, track_id: null, lane: null } });
  const milestone = bead('m-1', { title: 'Beta', issue_type: 'milestone', ready: true });
  await stubApi(page, { beads: [gate, milestone] });
  await stubBeadDetails(page, 'P', [beadDetail(gate), beadDetail(milestone)]);

  await ev.step('1. Open `/beads/P/g-1`', async () => {
    await page.goto('/beads/P/g-1');
    await expect(page.getByRole('heading', { name: 'Waits for track 2 to merge', level: 1 })).toBeVisible();
    await expect(page.getByText('Next', { exact: true })).toHaveCount(0);
  });
  await ev.step('2. Open `/beads/P/m-1`', async () => {
    await page.goto('/beads/P/m-1');
    await expect(page.getByRole('heading', { name: 'Beta', level: 1 })).toBeVisible();
    await expect(page.getByText('Next', { exact: true })).toHaveCount(0);
  });
});
