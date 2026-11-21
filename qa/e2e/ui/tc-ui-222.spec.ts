// TC: TC-UI-222@494d4a99
import { test, expect } from '../evidence';
import { E12, PROJECT } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-222: Opens on Overview (REQ-UI-119)', async ({ page, ev }) => {
  // Precondition: ex-e12 has lanes be, fe, infra and qa, and two comments.
  await openEpicStubs(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const tabs = page.getByRole('tablist', { name: 'Epic views' }).getByRole('tab');
    await expect(tabs).toHaveText(['Overview', 'Graph', 'Lanes', 'Discussion (2)']);
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).not.toHaveURL(/[?&]tab=/);
  });
});
