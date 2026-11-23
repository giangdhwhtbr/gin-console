// TC: TC-UI-255@f9e05215
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-255: My Tasks keeps its project (REQ-UI-073)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured; project b has bead b-1 assigned to the signed-in user qa@example.com.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = { a: [], b: [bead('b-1', { title: 'Fix billing', assignee: 'qa@example.com', ready: true })] };
  await stubApi(page, { projects: ['a', 'b'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);
  const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });

  await ev.step('1. Open `/my-tasks?project=b`', async () => {
    await page.goto('/my-tasks?project=b');
    await expect(page.getByRole('link', { name: 'Fix billing' })).toBeVisible();
  });

  await ev.step('2. Open `b-1` from the list', async () => {
    await page.getByRole('link', { name: 'Fix billing' }).click();
    await expect(page).toHaveURL(/\/beads\/b\/b-1$/);
    await expect(crumb.getByRole('listitem').first()).toHaveText('My Tasks');
    await expect(crumb.getByRole('link', { name: 'My Tasks' })).toHaveAttribute('href', '/my-tasks?project=b');
  });

  await ev.step('3. Use the first link of the breadcrumb', async () => {
    await crumb.getByRole('link', { name: 'My Tasks' }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/my-tasks?project=b');
    await expect(page.getByRole('link', { name: 'Fix billing' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveCount(0);
  });
});
