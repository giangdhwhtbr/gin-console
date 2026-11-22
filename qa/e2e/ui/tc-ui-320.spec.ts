// TC: TC-UI-320@4db91ed1
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';

test('TC-UI-320: Sidebar brand mark', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await stubApi(page);

  await ev.step('1. Open `/projects`', async () => {
    await page.goto('/'); // the Projects page is the root of the console
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  await ev.step('2. Read the sidebar header', async () => {
    const name = page.getByText('gin-console', { exact: true }).locator('visible=true');
    await expect(name).toBeVisible();
    const mark = name.locator('xpath=preceding-sibling::*[local-name()="svg"]');
    await expect(mark).toBeVisible();
    const circles = mark.locator('circle');
    await expect(circles).toHaveCount(3);
    await expect(circles.nth(0)).toHaveClass(/fill-state-done/);
    await expect(circles.nth(1)).toHaveClass(/fill-state-progress/);
    await expect(circles.nth(2)).toHaveClass(/stroke-state-ready/);
    await expect(circles.nth(2)).toHaveCSS('fill', 'rgb(255, 255, 255)');
    await expect(mark.locator('path')).toHaveCSS('stroke', 'rgb(106, 61, 184)');
    // the mark comes before the name
    const [m, n] = await Promise.all([mark.boundingBox(), name.boundingBox()]);
    expect(m!.x + m!.width).toBeLessThanOrEqual(n!.x);
  });
});
