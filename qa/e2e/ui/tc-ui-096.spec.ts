// TC: TC-UI-096@7df8b00b
import { test, expect } from '../evidence';
import { bead, detail, milestoneOption, stubApi } from '../support/api';

test('TC-UI-096: Milestone page last', async ({ page, ev }) => {
  // Precondition: project a with milestone m2 and bead a-1 under it, depending on a-2, so it is a node of the Graph view.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const m2 = bead('m2', { issue_type: 'milestone', milestone: 'm2' });
  const a1 = bead('a-1', { parent: 'm2', milestone: 'm2', blocked_by: ['a-2'], dependency_count: 1, blocked: true });
  const a2 = bead('a-2', { parent: 'm2', milestone: 'm2', dependent_count: 1 });
  await stubApi(page, {
    projects: ['a'],
    beads: [m2, a1, a2],
    milestoneOptions: { milestones: [milestoneOption('m2', { status: 'active' })], current: null },
    milestone: { m2: { ...detail([], { id: 'm2', title: 'Second milestone', status: 'active' }), away: {}, lanes: null } as never },
  });
  await page.route('**/api/beads/a/a-1', (route) =>
    route.fulfill({
      json: { ...a1, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] },
    }),
  );
  await page.route('**/api/beads/a/a-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('link', { name: 'Title a-1' })).toBeVisible();
  });

  await ev.step('2. Open `/milestones/a/m2?tab=beads&view=graph`', async () => {
    await page.goto('/milestones/a/m2?tab=beads&view=graph');
    await expect(page.locator('[data-node="a-1"]')).toBeVisible();
  });

  await ev.step('3. Open the bead page of a node', async () => {
    await page.locator('[data-node="a-1"]').click();
    await page.getByRole('complementary', { name: 'Bead details' }).getByRole('link', { name: 'Open page' }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  });

  await ev.step('4. Use the first link of the breadcrumb', async () => {
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/milestones\/a\/m2\?.*tab=beads/);
    await expect(page).toHaveURL(/view=graph/);
    await expect(page.getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-node="a-1"]')).toBeVisible();
  });
});
