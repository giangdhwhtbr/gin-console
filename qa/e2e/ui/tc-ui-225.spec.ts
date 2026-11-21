// TC: TC-UI-225@b7ca70c9
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { e12Counted, openEpicStubs, withComments } from '../support/epic';
import { PROJECT, plain } from '../support/lanes';

test('TC-UI-225: Not an epic (REQ-UI-119)', async ({ page, ev }) => {
  // Precondition: ex-e3.2 is a task, a child of epic ex-e3 (with comments, so that the page has its discussion column).
  await openEpicStubs(page, [...withComments(e12Counted()), ...plain(), bead('ex-e3.2', { title: 'Schedule the nightly export', parent: 'ex-e3', comment_count: 2 })]);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/ex-e3.2`, async () => {
    await page.goto(`/beads/${PROJECT}/ex-e3.2`);
    await expect(page.getByRole('heading', { name: 'Schedule the nightly export' })).toBeVisible();
    for (const name of ['Overview', 'Graph', 'Lanes']) await expect(page.getByRole('tab', { name })).toHaveCount(0);
    await expect(page.getByRole('tablist', { name: 'Epic views' })).toHaveCount(0);
    // the discussion sits beside the description, not behind a tab
    const discussion = page.locator('#panel-discussion');
    await expect(discussion).toBeVisible();
    const description = (await page.getByRole('heading', { name: 'Schedule the nightly export' }).boundingBox())!;
    const side = (await discussion.boundingBox())!;
    expect(side.x).toBeGreaterThan(description.x + description.width - 1);
  });
});
