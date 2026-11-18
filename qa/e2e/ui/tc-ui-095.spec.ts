// TC: TC-UI-095@aaa00b51
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-095: Storage refused', async ({ page, ev }) => {
  // Precondition: project a with bead a-1; session storage throws when the place is stored.
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('refused', 'QuotaExceededError');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await stubApi(page, { projects: ['a'], beads: [bead('a-1', { ready: true })] });
  await page.route('**/api/beads/a/a-1', (route) =>
    route.fulfill({
      json: { ...bead('a-1', { ready: true }), description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] },
    }),
  );
  await page.route('**/api/beads/a/a-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open `/beads?project=a&view=board`', async () => {
    await page.goto('/beads?project=a&view=board');
    await expect(page.getByRole('link', { name: /a-1/ }).first()).toBeVisible();
  });

  await ev.step('2. Open the bead page of `a-1`', async () => {
    await page.getByRole('link', { name: /a-1/ }).first().click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
  });

  await ev.step('3. Use the first link of the breadcrumb', async () => {
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/beads\?.*view=board/);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
