// TC: TC-UI-240@dd9b6ca6
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, mainNav } from '../support/shell';

test('TC-UI-240: Bead path (REQ-UI-126)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured; the current project is a.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'], beads: beadsOf({ a: [bead('a-1', { ready: true })] }) });

  await ev.step('1. Open `/beads?project=a`', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByRole('link', { name: /Title a-1/ })).toBeVisible();
  });

  await ev.step('2. Open `/beads/zzz/z-1`', async () => {
    await page.goto('/beads/zzz/z-1');
    await expect(page.getByRole('status').filter({ hasText: 'No project zzz is configured' })).toBeVisible();
  });

  await ev.step('3. Click "Beads" in the main navigation', async () => {
    await mainNav(page).getByRole('link', { name: 'Beads', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/beads?project=a');
    await expect(page.getByRole('link', { name: /Title a-1/ })).toBeVisible();
  });
});
