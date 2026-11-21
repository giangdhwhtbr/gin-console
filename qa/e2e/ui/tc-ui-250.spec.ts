// TC: TC-UI-250@f142191d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-250: Bead page (REQ-UI-063)', async ({ page, ev }) => {
  // Precondition: project example has bead a-1 titled "Team checkout".
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = { example: [bead('a-1', { title: 'Team checkout', ready: true })] };
  await stubApi(page, { projects: ['example'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/beads/example/a-1`', async () => {
    await page.goto('/beads/example/a-1');
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    await expect(page).toHaveTitle('Team checkout · example · gin-console');
  });
});
