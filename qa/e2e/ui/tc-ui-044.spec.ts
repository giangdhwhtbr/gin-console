// TC: TC-UI-044@09188db0
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf } from '../support/shell';

test('TC-UI-044: Current project (REQ-UI-105)', async ({ page, ev }) => {
  // Precondition: alpha (the current project) and beta each have an open bead assigned to me.
  const me = 'qa@example.com';
  await stubApi(page, {
    projects: ['alpha', 'beta'],
    beads: beadsOf({ alpha: [bead('alpha-1', { ready: true, assignee: me })], beta: [bead('beta-1', { ready: true, assignee: me })] }),
  });

  await ev.step('1. Open `/my-tasks`', async () => {
    await page.goto('/my-tasks');
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/my-tasks?project=alpha');
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Milestone' })).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Title alpha-1' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Title beta-1' })).toHaveCount(0);
  });
});
