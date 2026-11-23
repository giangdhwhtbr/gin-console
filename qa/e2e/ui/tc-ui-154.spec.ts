// TC: TC-UI-154@000cc74d
import type { Page } from '@playwright/test';
import { test, expect } from '../evidence';
import { stubExample, loaded } from '../support/example';
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

test('TC-UI-154: No overlapping text on Reports tabs (REQ-UI-110)', async ({ page, ev }) => {
  // Precondition: The example project is shown.
  test.setTimeout(240_000);
  const unstubbed = await stubExample(page);

  await ev.step('1. Set the theme to light', async () => { await setTheme(page, 'light'); });

  await ev.step('2. Set the window width to 390 px', async () => { await page.setViewportSize({ width: 390, height: 844 }); });

  await ev.step('3. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('4. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('5. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('6. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('7. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('8. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  await ev.step('9. Set the window width to 1024 px', async () => { await page.setViewportSize({ width: 1024, height: 768 }); });

  await ev.step('10. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('11. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('12. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('13. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('14. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('15. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  await ev.step('16. Set the window width to 1440 px', async () => { await page.setViewportSize({ width: 1440, height: 900 }); });

  await ev.step('17. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('18. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('19. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('20. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('21. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('22. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  await ev.step('23. Set the window width to 1920 px', async () => { await page.setViewportSize({ width: 1920, height: 1080 }); });

  await ev.step('24. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('25. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('26. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('27. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('28. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('29. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  await ev.step('30. Set the theme to dark', async () => { await setTheme(page, 'dark'); });

  await ev.step('31. Set the window width to 390 px', async () => { await page.setViewportSize({ width: 390, height: 844 }); });

  await ev.step('32. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('33. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('34. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('35. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('36. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('37. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  await ev.step('38. Set the window width to 1024 px', async () => { await page.setViewportSize({ width: 1024, height: 768 }); });

  await ev.step('39. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('40. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('41. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('42. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('43. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('44. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  await ev.step('45. Set the window width to 1440 px', async () => { await page.setViewportSize({ width: 1440, height: 900 }); });

  await ev.step('46. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('47. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('48. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('49. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('50. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('51. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  await ev.step('52. Set the window width to 1920 px', async () => { await page.setViewportSize({ width: 1920, height: 1080 }); });

  await ev.step('53. Open `/reports?project=example&tab=team`', async () => { await readable(page, '/reports?project=example&tab=team', loaded); });

  await ev.step('54. Open `/reports?project=example&tab=delivery`', async () => { await readable(page, '/reports?project=example&tab=delivery', loaded); });

  await ev.step('55. Open `/reports?project=example&tab=velocity`', async () => { await readable(page, '/reports?project=example&tab=velocity', loaded); });

  await ev.step('56. Open `/reports?project=example&tab=usage`', async () => { await readable(page, '/reports?project=example&tab=usage', loaded); });

  await ev.step('57. Open `/reports?project=example&tab=quality`', async () => { await readable(page, '/reports?project=example&tab=quality', loaded); });

  await ev.step('58. Open `/reports?project=example&tab=coverage`', async () => { await readable(page, '/reports?project=example&tab=coverage', loaded); });

  expect([...new Set(unstubbed)], 'API calls the spec does not stub').toEqual([]);
});
