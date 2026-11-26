// TC: TC-MILESTONE-UI-092@ca7a617a
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

const velocity = (sayDo: number | null) => ({ committed_points: 13, completed_points: 8, added_points: 3, say_do: sayDo, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86 });

test('TC-MILESTONE-UI-092: Commitment met in the list', async ({ page, ev }) => {
  // Precondition: M1 has velocity.say_do 0.62, M2 has say_do null, M3 has no velocity; every entry has 1 lane so the only dash of a row is the commitment.
  const m1 = { ...entry('M1', { title: 'Milestone one', status: 'active' }), lanes: 1, velocity: velocity(0.62) };
  const m2 = { ...entry('M2', { title: 'Milestone two', status: 'planned' }), lanes: 1, velocity: velocity(null) };
  const m3 = { ...entry('M3', { title: 'Milestone three', status: 'planned' }), lanes: 1 };
  await stubApi(page, { milestones: list([m1, m2, m3]) });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones?project=P&view=list', async () => {
    await page.goto('/milestones?project=P&view=list');
    const rows = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem');
    const row = (title: string) => rows.filter({ hasText: title });
    await expect(row('Milestone one').getByText('Commitment met 62%', { exact: true })).toBeVisible();
    await expect(row('Milestone two').getByText('–', { exact: true })).toBeVisible();
    await expect(row('Milestone three').getByText('–', { exact: true })).toBeVisible();
  });
});
