// TC: TC-UI-384@9455d1f3
// TC: TC-UI-384@x
import { test, expect } from '../evidence';
import { bead, overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';
import { beadsOf, firstCrumb, mainNav, stubBeadPages } from '../support/shell';

test('TC-UI-384: Overview with beads of two projects (REQ-UI-073)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a; bead b-1 belongs to project b.
  await signIn(page);
  const byProject = { a: [], b: [bead('b-1', { title: 'Fix billing' })] };
  await stubApi(page, {
    projects: ['a', 'b'],
    beads: beadsOf(byProject),
    overview: overview([overviewProject('a'), overviewProject('b', { blocked: [{ id: 'b-1', title: 'Fix billing', assignee: null, days: 4, blocker: null }] })]),
  });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Fix billing/ })).toBeVisible();
  });

  await ev.step('2. Click the link of `b-1` in a list', async () => {
    await page.getByRole('link', { name: /Fix billing/ }).click();
    await expect(page).toHaveURL(/\/beads\/b\/b-1$/);
    expect(await firstCrumb(page)).toEqual({ text: 'Overview', href: '/' });
    await expect(mainNav(page).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  });
});
