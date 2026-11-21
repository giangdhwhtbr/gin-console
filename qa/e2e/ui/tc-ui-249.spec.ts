// TC: TC-UI-249@38f70fa7
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-249: Five links (REQ-UI-055)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'] });

  await ev.step('1. Open `/my-tasks?project=a`', async () => {
    await page.goto('/my-tasks?project=a');
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(1);
    const links = mainNav(page).getByRole('link');
    await expect(links).toHaveText(['Projects', 'Beads', 'My Tasks', 'Milestones', 'Reports']);
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs).toEqual(['/', '/beads?project=a', '/my-tasks', '/milestones?project=a', '/reports?project=a']);
  });
});
