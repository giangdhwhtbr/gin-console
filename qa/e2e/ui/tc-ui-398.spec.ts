// TC: TC-UI-398@8824892e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-398: Blocker named on My work (REQ-UI-100)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; t-1 of ann is blocked by open t-9 "Set up CI" and t-10; t-4 of bob is blocked by t-2 "Design tokens" of ann.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, {
    beads: [
      bead('t-1', { title: 'Build checkout', assignee: 'ann', blocked: true, blocked_by: ['t-9', 't-10'] }),
      bead('t-9', { title: 'Set up CI', assignee: 'bob' }),
      bead('t-10', { title: 'Write docs', assignee: 'bob' }),
      bead('t-2', { title: 'Design tokens', status: 'in_progress', assignee: 'ann' }),
      bead('t-4', { title: 'Theme the app', assignee: 'bob', blocked: true, blocked_by: ['t-2'] }),
    ],
  });
  const group = (name: string) => page.getByRole('heading', { name: new RegExp(`^${name}\\b`) }).locator('xpath=..');

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    const blocked = group('Blocked').getByRole('row').filter({ hasText: 'Build checkout' });
    await expect(blocked).toContainText('Blocked by Set up CI');
    await expect(blocked).toContainText('+1');
    await expect(group('Waiting on me').getByRole('row').filter({ hasText: 'Theme the app' })).toContainText('Waits on Design tokens');
  });
});
