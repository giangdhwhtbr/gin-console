// TC: TC-UI-093@e0c391f1
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-093: Other project', async ({ page, ev }) => {
  // Precondition: projects a and b, each with a bead; the Beads page of project a was shown last.
  await stubApi(page, {
    projects: ['a', 'b'],
    beads: (url) => [bead(url.searchParams.get('project') === 'b' ? 'b-1' : 'a-1', { ready: true })],
  });
  await page.route('**/api/beads/b/b-1', (route) =>
    route.fulfill({
      json: { ...bead('b-1', { ready: true }), description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] },
    }),
  );
  await page.route('**/api/beads/b/b-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('link', { name: 'Title a-1' }).first()).toBeVisible();
  });

  await ev.step('2. Open the bead page of a bead of project `b`', async () => {
    await page.goto('/beads/b/b-1');
    const nav = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link').first()).toHaveAttribute('href', '/beads?project=b');
  });
});
