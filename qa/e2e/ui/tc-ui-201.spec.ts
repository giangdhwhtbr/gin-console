// TC: TC-UI-201@de2dd298
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-201: Workflow unavailable (REQ-UI-120)', async ({ page, ev }) => {
  // Precondition: the workflow request for ex-e12 answers 502 with an error.
  await openEpicStubs(page, undefined, { workflow: { status: 502, body: { error: 'gin state failed: unknown workflow' } } });
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    await expect(page.getByRole('region', { name: 'Workflow' })).toContainText('gin state failed: unknown workflow');
    const progress = page.getByRole('region', { name: 'Progress' });
    await expect(progress.getByRole('img', { name: '4 done, 4 ready of 8 tracks' })).toBeVisible(); // the large strand of the 8 tracks
    await expect(progress).toContainText('4 done, 4 ready');
    await expect(page.getByRole('region', { name: 'Milestone' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Milestone' })).not.toContainText('Loading');
  });
});
