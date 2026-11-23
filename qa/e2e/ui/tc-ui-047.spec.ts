// TC: TC-UI-047@64f6444f
// TC: TC-UI-047@x
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-047: My Tasks to Beads link (REQ-UI-022)', async ({ page, ev }) => {
  // Precondition: project a is configured and the My Tasks page is shown.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a'], beads: [bead('a-1', { assignee: 'qa@example.com' })] });
  await page.goto('/my-tasks?project=a');
  await page.evaluate(() => { (window as unknown as { __kept: boolean }).__kept = true; });

  await ev.step('1. Click "Beads" in the main navigation', async () => {
    await mainNav(page).getByRole('link', { name: 'Beads' }).click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/beads?project=a');
    await expect(page.getByRole('link', { name: 'Title a-1' }).first()).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(true);
  });
});
