// TC: TC-UI-046@b9e84953
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';
import { projectList, sidebarSwitcher } from '../support/shell';

test('TC-UI-046: Change project clears the milestone (REQ-UI-105)', async ({ page, ev }) => {
  // Precondition: alpha has milestones m2 and m3; beta's current milestone is b1.
  const me = 'qa@example.com';
  await page.setViewportSize({ width: 1280, height: 800 });
  await stubApi(page, {
    projects: ['alpha', 'beta'],
    milestoneOptions: (url) =>
      url.searchParams.get('project') === 'beta'
        ? { milestones: [milestoneOption('b1', { status: 'active' })], current: 'b1' }
        : { milestones: [milestoneOption('m2', { status: 'active' }), milestoneOption('m3', { status: 'planned' })], current: 'm2' },
    beads: (url) =>
      url.searchParams.get('project') === 'beta'
        ? [bead('beta-1', { assignee: me, milestone: 'b1' })]
        : [bead('alpha-2', { assignee: me, milestone: 'm2' }), bead('alpha-3', { assignee: me, milestone: 'm3' })],
  });

  await ev.step('1. Open `/my-tasks?project=alpha&milestone=m3`', async () => {
    await page.goto('/my-tasks?project=alpha&milestone=m3');
    await expect(page.getByRole('combobox', { name: 'Milestone' })).toHaveValue('m3');
    await expect(page.getByRole('link', { name: 'Title alpha-3' })).toBeVisible();
  });

  await ev.step('2. Open the project switcher', async () => {
    await sidebarSwitcher(page, 'alpha').click();
    await expect(projectList(page)).toBeVisible();
  });

  await ev.step('3. Choose `beta`', async () => {
    await projectList(page).getByRole('button', { name: 'beta', exact: true }).click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/my-tasks?project=beta');
    await expect(page.getByRole('combobox', { name: 'Milestone' })).toHaveValue('b1');
    await expect(page.getByRole('link', { name: 'Title beta-1' })).toBeVisible();
  });
});
