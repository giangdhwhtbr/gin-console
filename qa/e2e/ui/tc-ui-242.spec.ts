// TC: TC-UI-242@3e2dba77
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-242: Last opened card (REQ-UI-127)', async ({ page, ev }) => {
  // Precondition: project a has beads a-1 to a-8.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = { a: Array.from({ length: 8 }, (_, i) => bead(`a-${i + 1}`, { ready: true })) };
  await stubApi(page, { projects: ['a'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);
  const card = page.locator('[data-id="a-7"]');

  await ev.step('1. Open `/beads?project=a&view=board`', async () => {
    await page.goto('/beads?project=a&view=board');
    await expect(card).toBeVisible();
  });

  await ev.step('2. Open the card `a-7`', async () => {
    await card.getByRole('link', { name: /Title a-7/ }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-7$/);
  });

  await ev.step('3. Use the browser Back button', async () => {
    await page.goBack();
    await expect(card).toBeFocused();
    await expect(card).toHaveAttribute('data-last-opened', /.*/);
    await expect(card).not.toHaveAttribute('data-last-opened', /.*/, { timeout: 5000 });
  });
});
