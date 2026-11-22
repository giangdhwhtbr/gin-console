// TC: TC-UI-279@3c397cba
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-UI-279: Plain labels in the Milestones list', async ({ page, ev }) => {
  // Precondition: m1 of alpha has velocity.say_do 0.62 and lanes 2.
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const velocity = { committed_points: 13, completed_points: 8, added_points: 3, say_do: 0.62, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86 };
  await stubApi(page, {
    projects: ['alpha'],
    milestones: list([entry('m1', { title: 'Alpha launch', status: 'active', lanes: 2, velocity } as never)]),
  });

  await ev.step('1. Open `/milestones?project=alpha`', async () => {
    await page.goto('/milestones?project=alpha');
    const rows = page.getByRole('list', { name: 'Milestones' });
    const m1 = rows.getByRole('listitem').filter({ hasText: 'Alpha launch' });
    await expect(m1).toContainText('Commitment met 62%');
    await expect(m1).toContainText('2 lanes');
    const head = rows.locator('li[aria-hidden]');
    await expect(head.getByText('Commitment met', { exact: true })).toBeVisible();
    await expect(head.getByText('Parallel lanes', { exact: true })).toBeVisible();
    await head.getByText('Commitment met', { exact: true }).hover();
    await expect(page.getByRole('tooltip')).toContainText('share of the points committed at kick-off');
    await head.getByText('Parallel lanes', { exact: true }).hover();
    await expect(page.getByRole('tooltip')).toContainText('how many lines of work');
  });
});
