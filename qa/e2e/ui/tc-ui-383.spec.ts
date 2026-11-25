// TC: TC-UI-383@53dfb198
// TC: TC-UI-383@x
import { test, expect } from '../evidence';
import { bead, overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-383: Breadcrumb from Overview (REQ-UI-072)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured; bead a-1 of project a is titled "Fix login".
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
  });

  await ev.step('2. Click the link of `a-1` in a list', async () => {
    await page.getByRole('link', { name: /Fix login/ }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumb.getByRole('listitem')).toContainText(['Overview', 'Fix login']);
    await expect(crumb.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/');
    await expect(crumb.locator('[aria-current="page"]')).toHaveText('Fix login');
  });
});
