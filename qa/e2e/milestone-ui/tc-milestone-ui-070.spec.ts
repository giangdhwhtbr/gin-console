// TC: TC-MILESTONE-UI-070@a4879bd9
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-070: Changing tab', async ({ page, ev }) => {
  // Precondition: milestone m2 of project p.
  await stubApi(page, {
    projects: ['p'],
    milestone: { m2: detail([epicPlan('e1')], { id: 'm2' }) },
    beads: [bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' })],
  });
  const where = () => {
    const url = new URL(page.url());
    return url.pathname + url.search;
  };

  await ev.step('1. Open /milestones/p/m2?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w', async () => {
    await page.goto('/milestones/p/m2?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w');
    await expect(page.getByRole('tab', { name: 'Beads' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
  });

  await ev.step('2. Choose Gantt', async () => {
    await page.getByRole('tab', { name: 'Gantt' }).click();
    await expect(page.getByRole('tab', { name: 'Gantt' })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(where).toBe('/milestones/p/m2?start=2026-11-10&zoom=2w');
  });

  await ev.step('3. Choose Beads', async () => {
    await page.getByRole('tab', { name: 'Beads' }).click();
    await expect(page.getByRole('tab', { name: 'Beads' })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(where).toBe('/milestones/p/m2?tab=beads&start=2026-11-10&zoom=2w');
    await expect(page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Status', exact: true })).toBeVisible(); // a button without a value: no status filter
    await expect(page.getByRole('button', { name: /^Status ./ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
    await expect(page.getByRole('tree', { name: 'Beads of p' }).getByRole('treeitem')).toHaveCount(1);
  });
});
