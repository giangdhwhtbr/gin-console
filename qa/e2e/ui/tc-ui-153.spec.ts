// TC: TC-UI-153@2725e23f
import type { Page } from '@playwright/test';
import { test, expect } from '../evidence';
import { stubExample, text, heading } from '../support/example';
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

test('TC-UI-153: No overlapping text on Beads pages (REQ-UI-110)', async ({ page, ev }) => {
  // Precondition: The example project is shown.
  test.setTimeout(240_000);
  const unstubbed = await stubExample(page);

  await ev.step('1. Set the theme to light', async () => { await setTheme(page, 'light'); });

  await ev.step('2. Set the window width to 390 px', async () => { await page.setViewportSize({ width: 390, height: 844 }); });

  await ev.step('3. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('4. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('5. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('6. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('7. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('8. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  await ev.step('9. Set the window width to 1024 px', async () => { await page.setViewportSize({ width: 1024, height: 768 }); });

  await ev.step('10. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('11. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('12. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('13. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('14. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('15. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  await ev.step('16. Set the window width to 1440 px', async () => { await page.setViewportSize({ width: 1440, height: 900 }); });

  await ev.step('17. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('18. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('19. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('20. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('21. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('22. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  await ev.step('23. Set the window width to 1920 px', async () => { await page.setViewportSize({ width: 1920, height: 1080 }); });

  await ev.step('24. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('25. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('26. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('27. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('28. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('29. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  await ev.step('30. Set the theme to dark', async () => { await setTheme(page, 'dark'); });

  await ev.step('31. Set the window width to 390 px', async () => { await page.setViewportSize({ width: 390, height: 844 }); });

  await ev.step('32. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('33. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('34. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('35. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('36. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('37. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  await ev.step('38. Set the window width to 1024 px', async () => { await page.setViewportSize({ width: 1024, height: 768 }); });

  await ev.step('39. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('40. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('41. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('42. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('43. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('44. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  await ev.step('45. Set the window width to 1440 px', async () => { await page.setViewportSize({ width: 1440, height: 900 }); });

  await ev.step('46. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('47. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('48. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('49. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('50. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('51. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  await ev.step('52. Set the window width to 1920 px', async () => { await page.setViewportSize({ width: 1920, height: 1080 }); });

  await ev.step('53. Open `/beads?project=example&view=list`', async () => { await readable(page, '/beads?project=example&view=list', text(/\d+ of \d+/)); });

  await ev.step('54. Open `/beads?project=example&view=board`', async () => { await readable(page, '/beads?project=example&view=board', text(/\d+ of \d+/)); });

  await ev.step('55. Open `/beads?project=example&view=focus`', async () => { await readable(page, '/beads?project=example&view=focus', text(/\d+ of \d+/)); });

  await ev.step('56. Open `/beads?project=example&view=graph`', async () => { await readable(page, '/beads?project=example&view=graph', async (page) => { await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible(); }); });

  await ev.step('57. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => { await readable(page, '/beads?project=example&view=lanes&scope=ex-e12', async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); }); });

  await ev.step('58. Open `/beads/example/ex-e3`', async () => { await readable(page, '/beads/example/ex-e3', heading(/Billing exports/)); });

  expect([...new Set(unstubbed)], 'API calls the spec does not stub').toEqual([]);
});
