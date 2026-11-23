// TC: TC-UI-138@1209be3c
// TC: TC-UI-138@x
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-138: Refresh placement (REQ-UI-096)', async ({ page, ev }) => {
  // Precondition: the window is 1280px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a'] });
  await page.setViewportSize({ width: 1280, height: 800 });

  await ev.step('1. Open `/my-tasks?project=a`', async () => {
    await page.goto('/my-tasks?project=a');
    const refresh = page.getByRole('button', { name: 'Refresh data' });
    const theme = page.getByRole('button', { name: /^Switch to .* theme$/ });
    const firstLink = mainNav(page).getByRole('link').first();
    await expect(refresh).toBeVisible();
    const [r, t, l] = await Promise.all([refresh.boundingBox(), theme.boundingBox(), firstLink.boundingBox()]);
    expect(r!.y + r!.height).toBeLessThanOrEqual(l!.y);
    expect(Math.abs(r!.y - t!.y)).toBeLessThan(r!.height);
  });
});
