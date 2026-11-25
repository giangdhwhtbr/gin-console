// TC: TC-OVERVIEW-016@ac667829
// TC: TC-OVERVIEW-016@x
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';

test('TC-OVERVIEW-016: Unassigned last (REQ-OVERVIEW-005)', async ({ page, ev }) => {
  // Precondition: one in-progress bead of `ann` and four without assignee.
  await signIn(page);
  const loose = [1, 2, 3, 4].map((n) => ({ id: `a-${n + 1}`, title: `Title a-${n + 1}`, assignee: null }));
  await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { in_progress: [{ id: 'a-1', title: 'Title a-1', assignee: 'ann' }, ...loose] })]),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    const rows = page.locator('[data-person]');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toHaveAttribute('data-person', 'ann');
    await expect(rows.last()).toHaveAttribute('data-person', 'Unassigned');
    await expect(rows.last()).toContainText(/Unassigned\s*4/);
  });
});
