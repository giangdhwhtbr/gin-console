// TC: TC-UI-316@a7559843
import { test, expect } from '../evidence';

test('TC-UI-316: Projects card says missing as text', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.route('**/api/projects**', (route) =>
    route.fulfill({
      json: [{ name: 'gone', path: '/home/gin/gone', exists: false, workflow: { error: 'directory does not exist' }, beads: { error: 'directory does not exist' } }],
    }),
  );
  await page.route('**/api/**', (route) => (route.request().url().includes('/api/projects') ? route.fallback() : route.fulfill({ status: 404, json: { error: 'not stubbed' } })));

  await ev.step('1. Open `/projects`', async () => {
    await page.goto('/'); // the Projects page is the root of the console
    await expect(page.getByRole('article', { name: 'gone' })).toBeVisible();
  });

  await ev.step('2. Find the card of `gone`', async () => {
    const word = page.getByRole('article', { name: 'gone' }).getByText('missing', { exact: true });
    await expect(word).toBeVisible();
    await expect(word).toHaveCSS('color', 'rgb(180, 35, 24)'); // --destructive of the light theme
    for (const side of ['top', 'right', 'bottom', 'left']) await expect(word).toHaveCSS(`border-${side}-width`, '0px');
    await expect(word).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.getByRole('article', { name: 'gone' }).locator('[data-slot="badge"]')).toHaveCount(0);
  });
});
