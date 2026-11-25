// TC: TC-UI-011@fa37fd3f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-011: My work matches by email or name', async ({ page, ev }) => {
  // Preconditions: email giangdhwhtbr@gmail.com; project A has beads for giangdhwhtbr, GiangDHWHTBR@gmail.com, alice, and an unassigned one owned by the email.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'giangdhwhtbr@gmail.com'));
  await stubApi(page, {
    projects: ['A'],
    beads: [
      bead('a-1', { title: 'By name', ready: true, assignee: 'giangdhwhtbr' }),
      bead('a-2', { title: 'By mixed case email', ready: true, assignee: 'GiangDHWHTBR@gmail.com' }),
      bead('a-3', { title: 'Alice task', ready: true, assignee: 'alice' }),
      bead('a-4', { title: 'Owned only', ready: true, assignee: null, owner: 'giangdhwhtbr@gmail.com' }),
    ],
  });

  const group = (name: string) => page.getByRole('heading', { name: new RegExp(`^${name}\\b`) }).locator('xpath=..');
  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(group('Assigned to me').getByRole('link', { name: /By name/ })).toBeVisible();
    await expect(group('Assigned to me').getByRole('link', { name: /By mixed case email/ })).toBeVisible();
    await expect(group('Unclaimed').getByRole('link', { name: /Owned only/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Alice task/ })).toHaveCount(0);
  });
});
