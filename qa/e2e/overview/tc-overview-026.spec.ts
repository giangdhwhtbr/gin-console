// TC: TC-OVERVIEW-026@f275f798
// TC: TC-OVERVIEW-026@x
import { test, expect } from '../evidence';
import { epicWorkflow, overview, overviewProject, stubApi } from '../support/api';
import { section, signIn } from '../support/overview';

test('TC-OVERVIEW-026: Nothing to do (REQ-OVERVIEW-009)', async ({ page, ev }) => {
  // Precondition: an in-progress epic without a waiver.
  await signIn(page);
  await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { epics: [{ id: 'e-1', title: 'Title e-1' }] })]),
    workflow: epicWorkflow(),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Waivers (0)' })).toBeVisible();
  });

  await ev.step('2. Wait until the gates are read', async () => {
    await expect(section(page, 'Waivers (0)')).toContainText('None');
  });
});
