// TC: TC-OVERVIEW-021@6fae26cb
// TC: TC-OVERVIEW-021@x
import { test, expect } from '../evidence';
import { epicWorkflow, overview, overviewProject, stubApi } from '../support/api';
import { section, signIn } from '../support/overview';

test('TC-OVERVIEW-021: Waivers (REQ-OVERVIEW-008)', async ({ page, ev }) => {
  // Precondition: in-progress epic e-1 has plan_approved waived(hotfix) and a review waiver of e-1.2, "no reviewer".
  await signIn(page);
  await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { epics: [{ id: 'e-1', title: 'Title e-1' }] })]),
    workflow: epicWorkflow({ plan_approved: 'waived(hotfix)' }, [{ task_id: 'e-1.2', reason: 'no reviewer', actor: 'lead' }]),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Waivers (2)' })).toBeVisible();
  });

  await ev.step('2. Wait until the gates are read', async () => {
    const waivers = section(page, 'Waivers (2)');
    const rows = waivers.getByRole('listitem');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('plan_approved');
    await expect(rows.nth(0)).toContainText('hotfix');
    await expect(rows.nth(1)).toContainText('e-1.2');
    await expect(rows.nth(1)).toContainText('no reviewer');
  });
});
