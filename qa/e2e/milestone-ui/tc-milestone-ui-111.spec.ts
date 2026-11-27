// TC: TC-MILESTONE-UI-111@7c310874
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-111: Parallel lanes and finish in the list', async ({ page, ev }) => {
  // Preconditions: M1 has 2 lanes, ends 12 Nov, finishes 23 Nov (late); M2 has 1 lane, ends 4 Dec, finishes 1 Dec; the clock is 21 Nov 2026.
  await page.clock.setFixedTime(new Date('2026-11-21T09:00:00'));
  const m1 = { ...entry('m1', { title: 'Milestone one', status: 'active', start: '2026-11-02', end: '2026-11-12', finish: '2026-11-23' }), lanes: 2 };
  const m2 = { ...entry('m2', { title: 'Milestone two', status: 'planned', start: '2026-11-23', end: '2026-12-04', finish: '2026-12-01' }), lanes: 1 };
  await stubApi(page, { milestones: list([m1, m2], { today: '2026-11-21' }) });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones?project=P&view=list', async () => {
    await page.goto('/milestones?project=P&view=list');
    const rows = page.getByRole('list', { name: 'Milestones' });
    const header = rows.locator('li[aria-hidden="true"]').first();
    for (const name of ['Status', 'Milestone', 'Period', 'Parallel lanes', 'Commitment met', 'Epics', 'Warnings']) {
      await expect(header.getByText(name, { exact: true })).toBeVisible();
    }
    const r1 = rows.getByRole('listitem').filter({ hasText: 'Milestone one' });
    await expect(r1.getByText('2 lanes', { exact: true })).toBeVisible();
    await expect(r1.getByText('Finishes 23 Nov', { exact: true })).toHaveClass(/text-state-blocked/);
    const r2 = rows.getByRole('listitem').filter({ hasText: 'Milestone two' });
    await expect(r2.getByText('1 lane', { exact: true })).toBeVisible();
    await expect(r2.getByText('Finishes 1 Dec', { exact: true })).not.toHaveClass(/text-state-blocked/);
  });
});
