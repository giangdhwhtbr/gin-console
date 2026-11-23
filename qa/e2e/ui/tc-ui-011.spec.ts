// TC: TC-UI-011@58039327
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-011: My Tasks matches by email or name', async ({ page, ev }) => {
  // Preconditions: email giangdhwhtbr@gmail.com; project A has beads for giangdhwhtbr, GiangDHWHTBR@gmail.com, alice, and an unassigned one owned by the email.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'giangdhwhtbr@gmail.com'));
  await stubApi(page, {
    projects: ['A'],
    beads: [
      bead('a-1', { title: 'By name', assignee: 'giangdhwhtbr' }),
      bead('a-2', { title: 'By mixed case email', assignee: 'GiangDHWHTBR@gmail.com' }),
      bead('a-3', { title: 'Alice task', assignee: 'alice' }),
      bead('a-4', { title: 'Owned only', assignee: null, owner: 'giangdhwhtbr@gmail.com' }),
    ],
  });

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByRole('link', { name: /By name/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /By mixed case email/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Alice task/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Owned only/ })).toHaveCount(0);
    await expect(page.getByText('2 tasks', { exact: true })).toBeVisible();
  });
});
