// TC: TC-UI-409@b9841bdf
import { test, expect } from '../evidence';
import {  } from '../support/api';
import { changeContent, stubRequirements } from '../support/requirements';
import { projectList, sidebarSwitcher } from '../support/shell';

test('TC-UI-409: Choose on a change page (REQ-UI-123)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured.
  await stubRequirements(page, {
    projects: ['a', 'b'],
    change: { 'e1-login': changeContent('e1-login', { proposal: '# Proposal text' }) },
  });

  await ev.step('1. Open `/requirements/changes/e1-login?project=a`', async () => {
    await page.goto('/requirements/changes/e1-login?project=a');
    await expect(page.getByRole('heading', { name: 'Proposal text' })).toBeVisible();
  });

  await ev.step('2. Open the project switcher', async () => {
    await sidebarSwitcher(page, 'a').click();
    await expect(projectList(page)).toBeVisible();
  });

  await ev.step('3. Choose project `b`', async () => {
    await projectList(page).getByRole('button', { name: 'b', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/requirements/changes?project=b');
  });
});
