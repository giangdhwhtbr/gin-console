// TC: TC-AUTH-050@f3de17a7
import { test, expect } from '../evidence';

test('TC-AUTH-050: Sign-in screen on a phone (REQ-AUTH-014)', async ({ page, ev }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await ev.step('1. Open the console', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'gin-console' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  });
});
