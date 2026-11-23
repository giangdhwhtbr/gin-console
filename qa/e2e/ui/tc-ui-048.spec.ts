// TC: TC-UI-048@35c6527a
// TC: TC-UI-048@x
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-048: Long project name at 360px (REQ-UI-061)', async ({ page, ev }) => {
  // Precondition: a project with a 60-character name is configured; the window is 360px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const name = 'p'.repeat(60);
  await stubApi(page, { projects: [name], beads: [bead('a-1', { assignee: 'qa@example.com' })] });
  await page.setViewportSize({ width: 360, height: 800 });
  const noSideScroll = async () => {
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw);
  };

  await ev.step('1. Open `/beads?project=<name>`', async () => {
    await page.goto(`/beads?project=${name}`);
    const label = page.locator('header span.truncate', { hasText: name });
    await expect(label).toBeVisible();
    expect(await label.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await noSideScroll();
  });

  await ev.step('2. Open `/my-tasks?project=<name>`', async () => {
    await page.goto(`/my-tasks?project=${name}`);
    await expect(page.getByRole('link', { name: 'Title a-1' })).toBeVisible();
    await noSideScroll();
  });
});
