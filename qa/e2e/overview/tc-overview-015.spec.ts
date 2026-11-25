// TC: TC-OVERVIEW-015@6b810689
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';

test('TC-OVERVIEW-015: One person in two projects (REQ-OVERVIEW-005)', async ({ page, ev }) => {
  // Precondition: project a has one in-progress bead of `ann`; project b has two of `ann@example.com`.
  await signIn(page);
  await stubApi(page, {
    projects: ['a', 'b'],
    overview: overview([
      overviewProject('a', { in_progress: [{ id: 'a-1', title: 'Title a-1', assignee: 'ann' }] }),
      overviewProject('b', { in_progress: [{ id: 'b-1', title: 'Title b-1', assignee: 'ann@example.com' }, { id: 'b-2', title: 'Title b-2', assignee: 'ann@example.com' }] }),
    ]),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Work in progress' })).toBeVisible();
  });

  await ev.step('2. Read the row of `ann` in Work in progress', async () => {
    const rows = page.locator('[data-person]');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute('data-person', 'ann');
    await expect(rows.first()).toContainText(/ann\s*3\s*1 in a\s*2 in b/);
  });
});
