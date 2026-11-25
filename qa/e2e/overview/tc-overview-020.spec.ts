// TC: TC-OVERVIEW-020@bb1b87a5
import { test, expect } from '../evidence';
import { epicWorkflow, overview, overviewProject, stubApi } from '../support/api';
import { epicOf, section, signIn } from '../support/overview';

test('TC-OVERVIEW-020: Started before its plan (REQ-OVERVIEW-008)', async ({ page, ev }) => {
  // Precondition: in-progress epic e-1 has plan_approved unmet; e-2 has only implementation_complete and shipped unmet.
  await signIn(page);
  await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { epics: [{ id: 'e-1', title: 'Title e-1' }, { id: 'e-2', title: 'Title e-2' }] })]),
    workflow: (url) => epicWorkflow(epicOf(url) === 'e-1' ? { plan_approved: 'unmet' } : { implementation_complete: 'unmet', shipped: 'unmet' }),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gates not met (1)' })).toBeVisible();
  });

  await ev.step('2. Wait until the gates are read', async () => {
    const gates = section(page, 'Gates not met (1)');
    await expect(gates.getByRole('link', { name: /e-1/ })).toBeVisible();
    await expect(gates).toContainText('plan_approved');
    await expect(gates.getByRole('link', { name: /e-2/ })).toHaveCount(0);
  });
});
