// TC: TC-UI-144@173ffbfc
import type { Page } from '@playwright/test';
import { test, expect } from '../evidence';
import { stubExample } from '../support/example';
import { readabilityFindings, show } from '../support/readability';



let theme = 'light';
const setTheme = async (page: Page, next: 'light' | 'dark') => {
  theme = next;
  await page.addInitScript((t) => localStorage.setItem('gin-console-theme', t), next); // the last one registered runs last
};
const readable = async (page: Page, url: string, ready: (page: Page) => Promise<void>) => {
  await page.goto(url);
  await ready(page);
  const width = page.viewportSize()?.width;
  const findings = await readabilityFindings(page);
  expect(findings, `${url} @${width} ${theme}: ${findings.length} finding(s)\n${show(findings)}`).toEqual([]);
};

test('TC-UI-144: No overlapping text on My work (REQ-UI-110)', async ({ page, ev }) => {
  // Precondition: The example project is shown.
  test.setTimeout(240_000);
  const unstubbed = await stubExample(page);

  await ev.step('1. Set the theme to light', async () => { await setTheme(page, 'light'); });

  await ev.step('2. Set the window width to 390 px', async () => { await page.setViewportSize({ width: 390, height: 844 }); });

  await ev.step('3. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  await ev.step('4. Set the window width to 1024 px', async () => { await page.setViewportSize({ width: 1024, height: 768 }); });

  await ev.step('5. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  await ev.step('6. Set the window width to 1440 px', async () => { await page.setViewportSize({ width: 1440, height: 900 }); });

  await ev.step('7. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  await ev.step('8. Set the window width to 1920 px', async () => { await page.setViewportSize({ width: 1920, height: 1080 }); });

  await ev.step('9. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  await ev.step('10. Set the theme to dark', async () => { await setTheme(page, 'dark'); });

  await ev.step('11. Set the window width to 390 px', async () => { await page.setViewportSize({ width: 390, height: 844 }); });

  await ev.step('12. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  await ev.step('13. Set the window width to 1024 px', async () => { await page.setViewportSize({ width: 1024, height: 768 }); });

  await ev.step('14. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  await ev.step('15. Set the window width to 1440 px', async () => { await page.setViewportSize({ width: 1440, height: 900 }); });

  await ev.step('16. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  await ev.step('17. Set the window width to 1920 px', async () => { await page.setViewportSize({ width: 1920, height: 1080 }); });

  await ev.step('18. Open `/my-tasks`', async () => { await readable(page, '/my-tasks', async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); }); });

  expect([...new Set(unstubbed)], 'API calls the spec does not stub').toEqual([]);
});
