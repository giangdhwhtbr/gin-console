// TC: TC-UI-254@088d19d4
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-254: From My Tasks (REQ-UI-072)', async ({ page, ev }) => {
  // Precondition: project a has bead a-1 titled "Fix login" assigned to the signed-in user qa@example.com.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = { a: [bead('a-1', { title: 'Fix login', assignee: 'qa@example.com', ready: true })] };
  await stubApi(page, { projects: ['a'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/my-tasks?project=a`', async () => {
    await page.goto('/my-tasks?project=a');
    await expect(page.getByRole('link', { name: 'Fix login' })).toBeVisible();
  });

  await ev.step('2. Open `a-1` from the list', async () => {
    await page.getByRole('link', { name: 'Fix login' }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumb.getByRole('listitem')).toContainText(['My Tasks', 'Fix login']);
    await expect(crumb.getByRole('link', { name: 'My Tasks' })).toHaveAttribute('href', '/my-tasks?project=a');
    await expect(crumb.locator('[aria-current="page"]')).toHaveText('Fix login');
  });
});
