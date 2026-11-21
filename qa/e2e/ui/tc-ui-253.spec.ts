// TC: TC-UI-253@6900b501
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, mainNav, stubBeadPages } from '../support/shell';

test('TC-UI-253: Bead page from My Tasks (REQ-UI-057)', async ({ page, ev }) => {
  // Precondition: project alpha has bead a-1 assigned to the signed-in user qa@example.com.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = { alpha: [bead('a-1', { title: 'Fix login', assignee: 'qa@example.com', ready: true })] };
  await stubApi(page, { projects: ['alpha'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/my-tasks`', async () => {
    await page.goto('/my-tasks');
    await expect(page.getByRole('link', { name: 'Fix login' })).toBeVisible();
  });

  await ev.step('2. Open `a-1` from the list', async () => {
    await page.getByRole('link', { name: 'Fix login' }).click();
    await expect(page).toHaveURL(/\/beads\/alpha\/a-1$/);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    await expect(mainNav(page).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(mainNav(page).getByRole('link', { name: 'My Tasks', exact: true })).toHaveAttribute('aria-current', 'page');
  });
});
