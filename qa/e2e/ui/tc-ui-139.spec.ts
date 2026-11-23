// TC: TC-UI-139@daf7a02d
// TC: TC-UI-139@x
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-139: Open My Tasks (REQ-UI-099)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'], beads: [bead('a-1', { assignee: 'qa@example.com' })] });
  await page.goto('/beads?project=a');
  await page.evaluate(() => { (window as unknown as { __kept: boolean }).__kept = true; });

  await ev.step('2. Click "My Tasks" in the main navigation', async () => {
    const link = mainNav(page).getByRole('link', { name: 'My Tasks' });
    await link.click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/my-tasks?project=a');
    await expect(page.getByRole('link', { name: 'Title a-1' })).toBeVisible();
    await expect(link).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(true);
  });
});
