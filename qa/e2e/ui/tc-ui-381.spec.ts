// TC: TC-UI-381@99c6ea7d
import { test, expect } from '../evidence';
import { bead, overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';
import { beadsOf, mainNav, stubBeadPages } from '../support/shell';

test('TC-UI-381: Bead page from Overview (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured; bead a-1 is in project a.
  await signIn(page);
  const byProject = { a: [bead('a-1', { title: 'Fix login' })], b: [] };
  await stubApi(page, {
    projects: ['a', 'b'],
    beads: beadsOf(byProject),
    overview: overview([overviewProject('a', { blocked: [{ id: 'a-1', title: 'Fix login', assignee: null, days: 4, blocker: null }] }), overviewProject('b')]),
  });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Fix login/ })).toBeVisible();
    await expect(mainNav(page).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('2. Click the link of `a-1` in a list', async () => {
    await page.getByRole('link', { name: /Fix login/ }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(mainNav(page).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });
});
