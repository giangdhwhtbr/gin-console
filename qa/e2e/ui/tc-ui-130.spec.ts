// TC: TC-UI-130@367f3350
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, projectList, sidebarSwitcher } from '../support/shell';

test('TC-UI-130: Choose on the Beads page (REQ-UI-123)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured, each with a bead.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'], beads: beadsOf({ a: [bead('a-1', { ready: true })], b: [bead('b-1', { ready: true })] }) });

  await ev.step('1. Open `/beads?project=a&view=board&milestone=m1&status=open`', async () => {
    await page.goto('/beads?project=a&view=board&milestone=m1&status=open');
    await expect(page.getByRole('link', { name: /Title a-1/ })).toBeVisible();
  });

  await ev.step('2. Open the project switcher', async () => {
    await sidebarSwitcher(page, 'a').click();
    await expect(projectList(page)).toBeVisible();
  });

  await ev.step('3. Choose project `b`', async () => {
    await projectList(page).getByRole('button', { name: 'b', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=b&view=board');
    await expect(page.getByRole('link', { name: /Title b-1/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Title a-1/ })).toHaveCount(0);
  });
});
