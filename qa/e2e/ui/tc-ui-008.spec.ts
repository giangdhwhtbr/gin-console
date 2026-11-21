// TC: TC-UI-008@e853f656
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, projectList, sidebarSwitcher } from '../support/shell';

test('TC-UI-008: Default project and choice (REQ-UI-023)', async ({ page, ev }) => {
  // Precondition: projects A and B, each with beads; nothing was chosen in this tab and there is no favorite.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['A', 'B'], beads: beadsOf({ A: [bead('A-1', { ready: true })], B: [bead('B-1', { ready: true })] }) });

  await ev.step('1. Open `/beads` without `?project=`', async () => {
    await page.goto('/beads');
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=A');
    await expect(page.getByRole('link', { name: /Title A-1/ })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveCount(0);
  });

  await ev.step('2. Open the project switcher', async () => {
    await sidebarSwitcher(page, 'A').click();
    await expect(projectList(page)).toBeVisible();
  });

  await ev.step('3. Choose B', async () => {
    await projectList(page).getByRole('button', { name: 'B', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=B');
    await expect(page.getByRole('link', { name: /Title B-1/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Title A-1/ })).toHaveCount(0);
  });
});
