// TC: TC-UI-227@9d19e2ad
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, projectList, sidebarSwitcher, stubBeadPages } from '../support/shell';

test('TC-UI-227: Choose on a bead page (REQ-UI-123)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured; project a has bead a-1.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = { a: [bead('a-1', { ready: true })], b: [bead('b-1', { ready: true })] };
  await stubApi(page, { projects: ['a', 'b'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/beads/a/a-1`', async () => {
    await page.goto('/beads/a/a-1');
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  });

  await ev.step('2. Open the project switcher', async () => {
    await sidebarSwitcher(page, 'a').click();
    await expect(projectList(page)).toBeVisible();
  });

  await ev.step('3. Choose project `b`', async () => {
    await projectList(page).getByRole('button', { name: 'b', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=b');
    await expect(page.getByRole('link', { name: /Title b-1/ })).toBeVisible();
  });
});
