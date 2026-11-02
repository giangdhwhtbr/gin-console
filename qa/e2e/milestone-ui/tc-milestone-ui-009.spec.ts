// TC: TC-MILESTONE-UI-009@fad5442e
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-009: External blocker warning names the epic and its milestone', async ({ page, ev }) => {
  // Precondition: epic A in M1 warns `external_blocker`; it depends on E9, which sits in M2.
  await stubApi(page, {
    milestone: {
      M1: detail([
        epicPlan('A', {
          title: 'Epic A',
          external_depends_on: [{ id: 'E9', milestone: 'M2' }],
          warnings: [{ code: 'external_blocker', days: null }],
        }),
      ]),
    },
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    const a = page.getByRole('list', { name: 'Epics' }).getByRole('listitem').filter({ has: page.getByRole('link', { name: 'A', exact: true }) });
    await expect(a).toContainText('Blocked by E9 (in M2)');
  });
});
