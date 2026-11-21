// TC: TC-UI-094@9fe3d925
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-094: Reload', async ({ page, ev }) => {
  // Precondition: project a with bead a-1.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a'], beads: [bead('a-1', { status: 'in_progress', assignee: 'qa@example.com' })] });
  await page.route('**/api/beads/a/a-1', (route) =>
    route.fulfill({
      json: { ...bead('a-1', { status: 'in_progress', assignee: 'qa@example.com' }), description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] },
    }),
  );
  await page.route('**/api/beads/a/a-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open `/beads?project=a&view=focus`', async () => {
    await page.goto('/beads?project=a&view=focus');
    await expect(page.getByRole('link', { name: 'Title a-1' }).first()).toBeVisible();
  });

  await ev.step('2. Open the bead page of `a-1`', async () => {
    await page.getByRole('link', { name: 'Title a-1' }).first().click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: /^Beads › Focus/ })).toBeVisible();
  });

  await ev.step('3. Reload the page', async () => {
    await page.reload();
    const first = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').first();
    await expect(first).toHaveText(/^Beads › Focus/);
    await expect(first).toHaveAttribute('href', /view=focus/);
  });
});
