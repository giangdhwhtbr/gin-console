// TC: TC-UI-075@aba8734c
import { test, expect } from '../evidence';
import { epicOf, stubProject } from '../support/graph';

test('TC-UI-075: Not found (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: alpha has no bead x-1.
  await stubProject(page, 'alpha', [epicOf('e-1')]);

  await ev.step('1. Open `/beads/alpha/x-1/graph`', async () => {
    await page.goto('/beads/alpha/x-1/graph');
    await expect(page.getByText('Bead not found')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Beads' })).toBeVisible();
  });
});
