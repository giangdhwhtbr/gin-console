// TC: TC-UI-228@473eeb18
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { projectList, sidebarSwitcher } from '../support/shell';

test('TC-UI-228: Favorite first (REQ-UI-123)', async ({ page, ev }) => {
  // Precondition: projects a, b and c are configured and c is the favorite.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.addInitScript(() => window.localStorage.setItem('gin-console-favorite-project', 'c'));
  await stubApi(page, { projects: ['a', 'b', 'c'] });

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(sidebarSwitcher(page, 'a')).toBeEnabled();
  });

  await ev.step('2. Open the project switcher', async () => {
    await sidebarSwitcher(page, 'a').click();
    await expect(projectList(page).getByRole('listitem')).toHaveText(['c', 'a', 'b']);
    await expect(projectList(page).getByRole('button', { name: 'Remove c as favorite' })).toHaveAttribute('aria-pressed', 'true');
    await expect(projectList(page).getByRole('button', { name: 'Make a the favorite' })).toHaveAttribute('aria-pressed', 'false');
    await expect(projectList(page).getByRole('button', { name: 'Make b the favorite' })).toHaveAttribute('aria-pressed', 'false');
  });
});
