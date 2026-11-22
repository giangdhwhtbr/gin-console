// TC: TC-UI-285@5ba81e21
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-285: Bead page without an assignee', async ({ page, ev }) => {
  // Precondition: task t-1 of project alpha has owner lead@example.com and no assignee.
  const t1 = bead('t-1', { owner: 'lead@example.com', assignee: null, issue_type: 'task' } as never);
  const detail = {
    ...t1, owner: 'lead@example.com', assignee: null, created_by: null, kind: null, capabilities: [],
    complexity: null, estimate_minutes: null, description: 'A description', design: null, notes: null,
    acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [],
  };
  await stubApi(page, { projects: ['alpha'], beads: [t1] });
  await page.route(/\/api\/beads\/alpha\/t-1(\/comments)?(\?.*)?$/, async (route) => {
    const comments = new URL(route.request().url()).pathname.endsWith('/comments');
    await route.fulfill({ json: comments ? [] : detail });
  });

  await ev.step('1. Open `/beads/alpha/t-1`', async () => {
    await page.goto('/beads/alpha/t-1');
    await expect(page.getByRole('heading', { name: 'Title t-1' })).toBeVisible();
    await expect(page.getByText('Assignee', { exact: true }).locator('xpath=following-sibling::*[1]')).toHaveText('Unassigned');
    await expect(page.getByText('Created by', { exact: true }).locator('xpath=following-sibling::*[1]')).toHaveText('lead');
  });
});
