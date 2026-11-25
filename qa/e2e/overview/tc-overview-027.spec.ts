// TC: TC-OVERVIEW-027@94f7e70b
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';

test('TC-OVERVIEW-027: Definition (REQ-OVERVIEW-009)', async ({ page, ev }) => {
  // Precondition: aging_days is 3.
  await signIn(page);
  await stubApi(page, { projects: ['a'], overview: overview([overviewProject('a')], { aging_days: 3 }) });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^In progress > 3 days/ })).toBeVisible();
  });

  await ev.step('2. Move keyboard focus to the heading "In progress > 3 days"', async () => {
    await page.getByRole('heading', { name: /^In progress > 3 days/ }).locator('span').first().focus();
    const tip = page.getByRole('tooltip');
    await expect(tip).toContainText('beads in progress');
    await expect(tip).toContainText('working days');
    await expect(tip).toContainText('Blocked beads are listed under Blocked');
  });
});
