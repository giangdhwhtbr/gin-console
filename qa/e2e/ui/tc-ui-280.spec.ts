// TC: TC-UI-280@25505e86
import { test, expect } from '../evidence';
import { bead, detail, entry, epicPlan, list, stubApi, type EpicPlan } from '../support/api';

test('TC-UI-280: Plain labels in the Gantt row', async ({ page, ev }) => {
  // Precondition: ex-e3 has 5 of 11 tracks closed, 1 of 3 prep tasks closed and a confirmed spec, and belongs to ex-m2 of project example.
  const plan = { ...epicPlan('ex-e3', { title: 'Billing exports for finance', status: 'open' }), spec_confirmed: true } as EpicPlan;
  await page.setViewportSize({ width: 1600, height: 900 });
  await stubApi(page, {
    projects: ['example'],
    milestones: list([entry('ex-m2', { title: 'Checkout v2', status: 'active' })]),
    milestone: { 'ex-m2': detail([plan], { id: 'ex-m2', title: 'Checkout v2', status: 'active' }) },
    beads: [bead('ex-e3', { issue_type: 'epic', milestone: 'ex-m2', child_counts: { total: 11, closed: 5, prep_total: 3, prep_closed: 1 } })],
  });

  await ev.step('1. Open the milestone page of that milestone, for example `/milestones/example/ex-m2`', async () => {
    await page.goto('/milestones/example/ex-m2');
    const row = page.locator('[data-epic="ex-e3"]');
    await expect(row).toBeVisible();
    const strand = row.locator('[data-strand="5/11"]').first();
    await expect(strand).toBeVisible();
    await expect(strand).toContainText('5/11');
    await expect(row).toContainText('Prep 1/3');
    await expect(row).toContainText('Spec approved');
  });
});
