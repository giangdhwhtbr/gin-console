// TC: TC-UI-226@174b2ed7
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { e12Counted, openEpicStubs, withComments } from '../support/epic';
import { plain } from '../support/lanes';

test('TC-UI-226: Progress by state (REQ-UI-120)', async ({ page, ev }) => {
  // Precondition: ex-e12 has 8 tracks (4 closed, 1 in progress, 2 ready, 1 blocked) and a merge gate child.
  // the counts of the epic: the backend sends one per state (REQ-BEADS-022)
  const counted = withComments(e12Counted()).map((b) => (b.id === E12
    ? { ...b, child_counts: { total: 8, closed: 4, in_progress: 1, blocked: 1, ready: 2, deferred: 0, prep_total: 0, prep_closed: 0 } }
    : b));
  await openEpicStubs(page, [...counted, ...plain()]);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const card = page.getByRole('region', { name: 'Progress' });
    const strand = card.getByRole('img', { name: '4 done, 1 in progress, 1 blocked, 2 ready of 8 tracks' });
    await expect(strand).toBeVisible();
    await expect(strand).toHaveAttribute('data-strand', '4/8');
    await expect(card).toContainText('4 done, 1 in progress, 1 blocked, 2 ready');
  });
});
