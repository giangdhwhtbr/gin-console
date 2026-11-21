// TC: TC-UI-234@5112377a
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf } from '../support/shell';

test('TC-UI-234: Removed project (REQ-UI-124)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured; the favorite old is not configured; nothing was chosen in this tab.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.addInitScript(() => window.localStorage.setItem('gin-console-favorite-project', 'old'));
  await stubApi(page, {
    projects: ['a', 'b'],
    beads: beadsOf({ a: [bead('a-1', { ready: true })], b: [bead('b-1', { ready: true })] }),
  });

  await ev.step('1. Open `/beads`', async () => {
    await page.goto('/beads');
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=a');
    await expect(page.getByRole('link', { name: /Title a-1/ })).toBeVisible();
  });
});
