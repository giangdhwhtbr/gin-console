// TC: TC-OVERVIEW-028@1f5841da
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';

test('TC-OVERVIEW-028: Project error (REQ-OVERVIEW-010)', async ({ page, ev }) => {
  // Precondition: project a answers an error; project b has the blocked bead t-3.
  await signIn(page);
  await stubApi(page, {
    projects: ['a', 'b'],
    overview: overview([
      overviewProject('a', { error: 'issues.jsonl is missing' }),
      overviewProject('b', { blocked: [{ id: 't-3', title: 'Title t-3', assignee: null, days: 4, blocker: null }] }),
    ]),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    const alert = page.getByRole('alert');
    await expect(alert).toHaveCount(1);
    await expect(alert).toContainText('a could not be loaded');
    await expect(alert).toContainText('issues.jsonl is missing');
    await expect(page.getByRole('link', { name: /t-3/ })).toHaveAttribute('href', '/beads/b/t-3');
  });
});
