// TC: TC-MILESTONE-UI-067@60f8f696
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-067: Prep task', async ({ page, ev }) => {
  // Preconditions: project alpha, milestone m2; e-1 has tracks t-1 (closed), t-2 (open) and prep task p-1 (closed);
  // e-2 has only prep task p-2 (open).
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    projects: ['alpha'],
    milestone: {
      m2: detail(
        [
          epicPlan('e-1', { title: 'Epic one', planned_start: '2026-11-02', planned_end: '2026-11-06' }),
          epicPlan('e-2', { title: 'Epic two', planned_start: '2026-11-09', planned_end: '2026-11-11' }),
        ],
        { id: 'm2', title: 'Milestone two' },
      ),
    },
    beads: [
      bead('e-1', { issue_type: 'epic' }),
      bead('e-2', { issue_type: 'epic' }),
      bead('t-1', { parent: 'e-1', status: 'closed', closed_at: '2026-11-03T10:00:00Z', labels: ['track:a'] }),
      bead('t-2', { parent: 'e-1', labels: ['track:b'] }),
      bead('p-1', { parent: 'e-1', status: 'closed', closed_at: '2026-11-02T10:00:00Z', labels: ['prep', 'prep:mockup'] }),
      bead('p-2', { parent: 'e-2', labels: ['prep'] }),
    ],
  });
  const e1 = page.locator('[data-epic="e-1"]');
  const e2 = page.locator('[data-epic="e-2"]');
  const row = (id: string) => page.locator(`[data-child="${id}"]`);

  await ev.step('1. Open `/milestones/alpha/m2`', async () => {
    await page.goto('/milestones/alpha/m2');
    await expect(e1).toBeVisible();
    await expect(e2).toBeVisible();
    await expect(e1.locator('[data-strand="1/2"]')).toContainText('1/2');
    await expect(e1).toContainText('Prep 1/1');
    await expect(e2).toContainText('Prep 0/1');
    await expect(e2.locator('[data-strand]')).toHaveCount(0);
  });

  await ev.step('2. Expand `e-1`', async () => {
    await page.getByRole('button', { name: 'Show 3 child beads of e-1' }).click();
    await expect(row('p-1')).toBeVisible();
    await expect(row('t-1')).toBeVisible();
    await expect(row('t-2')).toBeVisible();
    await expect(row('p-1').getByText('Prep', { exact: true })).toHaveCount(1);
    await expect(row('t-1').getByText('Prep', { exact: true })).toHaveCount(0);
    await expect(row('t-2').getByText('Prep', { exact: true })).toHaveCount(0);
  });

  await ev.step('3. Expand `e-2`', async () => {
    await page.getByRole('button', { name: 'Show 1 child bead of e-2' }).click();
    await expect(row('p-2')).toBeVisible();
    await expect(row('p-2').getByText('Prep', { exact: true })).toHaveCount(1);
    await expect(page.locator('[data-child]')).toHaveCount(4);
    await expect(page.locator('[data-child]').filter({ has: page.getByText('Prep', { exact: true }) })).toHaveCount(2);
  });
});
