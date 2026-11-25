// TC: TC-UI-400@fe2b738c
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-400: Each group of My work (REQ-UI-150)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; project P has t-1 to t-6 (test data).
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, {
    beads: [
      bead('t-1', { title: 'Mine ready', ready: true, assignee: 'ann' }),
      bead('t-2', { title: 'Nobody ready', ready: true }),
      bead('t-3', { title: 'Mine active', status: 'in_progress', assignee: 'ann' }),
      bead('t-4', { title: 'Mine stuck', assignee: 'ann', blocked: true, blocked_by: ['t-5'] }),
      bead('t-5', { title: 'Bob blocker', assignee: 'bob' }),
      bead('t-6', { title: 'Bob waits', assignee: 'bob', blocked: true, blocked_by: ['t-3'] }),
    ],
  });
  const group = (name: string) => page.getByRole('heading', { name: new RegExp(`^${name}\\b`) }).locator('xpath=..');

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    await expect(group('Assigned to me').getByRole('link', { name: /Mine ready/ })).toBeVisible();
    await expect(group('Unclaimed').getByRole('link', { name: /Nobody ready/ })).toBeVisible();
    await expect(group('In progress').getByRole('link', { name: /Mine active/ })).toBeVisible();
    await expect(group('Blocked').getByRole('link', { name: /Mine stuck/ })).toBeVisible();
    await expect(group('Blocked')).toContainText('Blocked by Bob blocker');
    await expect(group('Waiting on me').getByRole('link', { name: /Bob waits/ })).toBeVisible();
    await expect(group('Waiting on me')).toContainText('Waits on Mine active');
    await expect(page.getByRole('link', { name: /Bob blocker/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Assigned to me 1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Waiting on me 1' })).toBeVisible();
  });
});
