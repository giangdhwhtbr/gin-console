// TC: TC-UI-281@04078f2d
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProjectPulls } from '../support/pull';

test('TC-UI-281: No assignee shows Unassigned', async ({ page, ev }) => {
  // Precondition: alpha has bead t-1 with owner lead@example.com and no assignee.
  const t1 = bead('t-1', { title: 'Card title', ready: true, owner: 'lead@example.com', assignee: null });
  await stubProjectPulls(
    page,
    [{ name: 'alpha', path: '/tmp/alpha', beads: { open: 1, in_progress: 0, blocked: 0, ready: 0, epics: [] } }],
    [t1],
  );
  await page.route('**/api/beads/alpha/t-1', (route) =>
    route.fulfill({
      json: { ...t1, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] },
    }),
  );
  await page.route('**/api/beads/alpha/t-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=list`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    const row = page.getByRole('treeitem', { name: /^t-1 / });
    await expect(row).toContainText('Unassigned');
    await expect(row).not.toContainText('lead@example.com');
  });

  await ev.step('2. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    await expect(card).toContainText('Unassigned');
    await expect(card).not.toContainText('lead@example.com');
  });

  await ev.step('3. Open `/beads/alpha/t-1`', async () => {
    await page.goto('/beads/alpha/t-1');
    await expect(page.getByRole('heading', { name: 'Card title' })).toBeVisible();
    await expect(page.getByText('Unassigned')).toBeVisible();
    await expect(page.getByText('lead@example.com')).toHaveCount(0);
  });
});
