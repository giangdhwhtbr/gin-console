// TC: TC-UI-233@2266d9c9
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf } from '../support/shell';

test('TC-UI-233: Favorite in a new tab (REQ-UI-124)', async ({ page, ev }) => {
  // Precondition: projects a, b and c are configured; c is the favorite; nothing was chosen in this tab.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.addInitScript(() => window.localStorage.setItem('gin-console-favorite-project', 'c'));
  await stubApi(page, {
    projects: ['a', 'b', 'c'],
    beads: beadsOf({ a: [bead('a-1', { ready: true })], c: [bead('c-1', { ready: true })] }),
  });

  await ev.step('1. Open `/beads`', async () => {
    await page.goto('/beads');
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=c');
    await expect(page.getByRole('link', { name: /Title c-1/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Title a-1/ })).toHaveCount(0);
  });
});
