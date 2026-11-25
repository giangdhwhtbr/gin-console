// TC: TC-OVERVIEW-023@d05e34d6
import { test, expect } from '../evidence';
import { epicWorkflow, overview, overviewProject, stubApi } from '../support/api';
import { epicOf, section, signIn } from '../support/overview';

test('TC-OVERVIEW-023: One epic fails (REQ-OVERVIEW-008)', async ({ page, ev }) => {
  // Precondition: e-3 has a workflow request that answers 502; e-1 has plan_approved unmet; e-2 answers without a gate to show.
  await signIn(page);
  await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { epics: [1, 2, 3].map((n) => ({ id: `e-${n}`, title: `Title e-${n}` })) })]),
    workflow: (url) => {
      const epic = epicOf(url);
      if (epic === 'e-3') return { status: 502, body: { error: 'bd export failed' } };
      return epicWorkflow(epic === 'e-1' ? { plan_approved: 'unmet' } : {});
    },
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gates not met (1)' })).toBeVisible();
  });

  await ev.step('2. Wait until all requests have ended', async () => {
    const gates = section(page, 'Gates not met (1)');
    await expect(gates).toContainText('Could not read gates');
    await expect(gates).toContainText('e-3');
    await expect(gates).toContainText('bd export failed');
    await expect(gates.getByRole('listitem')).toHaveCount(1); // only e-1 is counted
  });
});
