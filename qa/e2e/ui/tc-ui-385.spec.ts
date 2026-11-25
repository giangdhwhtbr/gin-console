// TC: TC-UI-385@57c9c844
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';
import { mainNav, projectList, sidebarSwitcher } from '../support/shell';

test('TC-UI-385: Choose on Overview (REQ-UI-123)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a.
  await signIn(page);
  await stubApi(page, {
    projects: ['a', 'b'],
    overview: overview([
      overviewProject('a'),
      overviewProject('b', { blocked: [{ id: 'b-1', title: 'Fix billing', assignee: null, days: 4, blocker: null }] }),
    ]),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Fix billing/ })).toBeVisible();
    await expect(mainNav(page).getByRole('link', { name: 'Beads' })).toHaveAttribute('href', '/beads?project=a');
  });

  await ev.step('2. Choose project `b` in the project switcher', async () => {
    await sidebarSwitcher(page, 'a').click();
    await projectList(page).getByRole('button', { name: 'b', exact: true }).click();
    await expect(page).toHaveURL((u) => u.pathname === '/');
    await expect(page.getByRole('link', { name: /Fix billing/ })).toBeVisible();
    const nav = mainNav(page);
    await expect(nav.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('href', '/');
    await expect(nav.getByRole('link', { name: 'Beads', exact: true })).toHaveAttribute('href', '/beads?project=b');
    await expect(nav.getByRole('link', { name: 'My work', exact: true })).toHaveAttribute('href', '/my-tasks?project=b');
    await expect(nav.getByRole('link', { name: 'Milestones', exact: true })).toHaveAttribute('href', '/milestones?project=b');
    await expect(nav.getByRole('link', { name: 'Reports', exact: true })).toHaveAttribute('href', '/reports/status?project=b');
  });
});
