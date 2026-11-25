// TC: TC-UI-045@9ee34356
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-045: Project with a current milestone (REQ-UI-105)', async ({ page, ev }) => {
  // Precondition: alpha's current milestone is m2; my open tasks sit under m2 and under planned m3.
  const me = 'qa@example.com';
  await stubApi(page, {
    projects: ['alpha'],
    milestoneOptions: {
      milestones: [milestoneOption('m2', { status: 'active' }), milestoneOption('m3', { status: 'planned' })],
      current: 'm2',
    },
    beads: [bead('alpha-2', { ready: true, assignee: me, milestone: 'm2' }), bead('alpha-3', { ready: true, assignee: me, milestone: 'm3' })],
  });

  await ev.step('1. Open `/my-tasks?project=alpha`', async () => {
    await page.goto('/my-tasks?project=alpha');
    await expect(page.getByRole('link', { name: 'Title alpha-2' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Milestone' })).toHaveValue('m2');
    await expect(page.getByRole('combobox', { name: 'Milestone' }).locator('option:checked')).toHaveText('Title m2');
    await expect(page.getByRole('link', { name: 'Title alpha-3' })).toHaveCount(0);
  });
});
