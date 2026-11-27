// TC: TC-MILESTONE-UI-142@233531e5
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';
import { caseList, stubQa } from '../support/qa';

test('TC-MILESTONE-UI-142: Readiness tab (REQ-MILESTONE-UI-018)', async ({ page, ev }) => {
  // Precondition: milestone m2 of project p.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    projects: ['p'],
    milestone: { m2: detail([epicPlan('e1')], { id: 'm2' }) },
    beads: [bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' })],
  });
  await stubQa(page, { cases: caseList([]) });

  await ev.step('1. Open /milestones/p/m2?tab=readiness', async () => {
    await page.goto('/milestones/p/m2?tab=readiness');
    await expect(page.getByRole('tab', { name: 'Readiness' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });
});
