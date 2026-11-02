// TC: TC-MILESTONE-UI-065@61471839
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-065: Expanding one epic leaves the others as they are', async ({ page, ev }) => {
  // Precondition: epics A and B in M1, each with child beads.
  await stubApi(page, {
    milestone: { M1: detail([epicPlan('A'), epicPlan('B')]) },
    beads: [
      bead('A', { issue_type: 'epic' }),
      bead('B', { issue_type: 'epic' }),
      bead('A.1', { parent: 'A' }),
      bead('B.1', { parent: 'B' }),
    ],
  });
  const aKid = page.locator('[data-child="A.1"]');
  const bKid = page.locator('[data-child="B.1"]');

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('button', { name: 'Show 1 child bead of A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show 1 child bead of B' })).toBeVisible();
  });

  await ev.step('2. Expand A', async () => {
    await page.getByRole('button', { name: 'Show 1 child bead of A' }).click();
    await expect(aKid).toBeVisible();
    await expect(bKid).toHaveCount(0);
  });

  await ev.step('3. Expand B', async () => {
    await page.getByRole('button', { name: 'Show 1 child bead of B' }).click();
    await expect(bKid).toBeVisible();
    await expect(aKid).toBeVisible();
  });

  await ev.step('4. Collapse A', async () => {
    await page.getByRole('button', { name: 'Hide 1 child bead of A' }).click();
    await expect(aKid).toHaveCount(0);
    await expect(bKid).toBeVisible();
  });
});
