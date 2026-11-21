// TC: TC-UI-219@187d5ebf
import { test, expect } from '../evidence';
import { epicOf, stubProject } from '../support/graph';

test('TC-UI-219: No extra history entry (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: project p has epic e-1.
  await stubProject(page, 'p', [epicOf('e-1')]);

  await ev.step('1. Open `/beads/p/e-1`', async () => {
    await page.goto('/beads/p/e-1');
    await expect(page).toHaveURL(/\/beads\/p\/e-1$/);
    await expect(page.getByRole('heading', { name: 'Title e-1' })).toBeVisible();
  });

  await ev.step('2. Open `/beads/p/graph`', async () => {
    await page.goto('/beads/p/graph');
    await expect(page).toHaveURL(/\/beads\?project=p&view=graph$/);
    await expect(page.getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'true');
  });

  await ev.step("3. Press the browser's back button", async () => {
    await page.goBack();
    await expect(page).toHaveURL(/\/beads\/p\/e-1$/);
    await expect(page.getByRole('heading', { name: 'Title e-1' })).toBeVisible();
  });
});
