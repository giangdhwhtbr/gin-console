// TC: TC-UI-236@59fc3ed1
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';
import { mainNav, projectList, sidebarSwitcher } from '../support/shell';

test('TC-UI-236: Storage refused (REQ-UI-124)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured; the browser throws when a choice is stored.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('refused', 'QuotaExceededError');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await stubApi(page, {
    projects: ['a', 'b'],
    milestones: (url) => list([entry('M1', { title: `Milestone of ${url.searchParams.get('project')}` })]),
  });

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(sidebarSwitcher(page, 'a')).toBeEnabled();
  });

  await ev.step('2. Open the project switcher', async () => {
    await sidebarSwitcher(page, 'a').click();
    await expect(projectList(page)).toBeVisible();
  });

  await ev.step('3. Choose project `b`', async () => {
    await projectList(page).getByRole('button', { name: 'b', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=b');
  });

  await ev.step('4. Click "Milestones" in the main navigation', async () => {
    await mainNav(page).getByRole('link', { name: 'Milestones', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/milestones?project=b');
    await expect(page.getByRole('list', { name: 'Milestones' }).getByRole('listitem')).toContainText('Milestone of b');
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
