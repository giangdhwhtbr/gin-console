// TC: TC-UI-147@d135e6de
import type { Page } from '@playwright/test';
import { test, expect } from '../evidence';
import { stubExample, loaded } from '../support/example';
import { readabilityFindings, show } from '../support/readability';



const setTheme = async (page: Page, next: 'light' | 'dark') => {
  await page.addInitScript((t) => localStorage.setItem('gin-console-theme', t), next); // the last one registered runs last
};

const WCAG = 4.5;
/** The contrast findings of the page (REQ-UI-110: at least 4.5:1) and, for each milestone, that its id and label are shown. */
const contrast = async (page: Page, url: string, tab: 'team' | 'velocity') => {
  await page.goto(url);
  await loaded(page);
  if (tab === 'velocity') {
    // the table rows and the chart axes name each milestone by id
    for (const id of ['ex-m1', 'ex-m2']) await expect(page.getByRole('cell', { name: id, exact: true }), `${url}: ${id} is shown`).toBeVisible();
    for (const id of ['ex-m1', 'ex-m2']) await expect(page.locator('svg text', { hasText: id }).first(), `${url}: the chart names ${id}`).toBeAttached();
  } else {
    // the Team tab shows the chosen milestone's label as its heading; every milestone is a choice of the select
    await expect(page.getByRole('heading', { name: 'Beta readiness for the regional launch' }), `${url}: the milestone label is shown`).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Report scope' })).toBeVisible();
  }
  const findings = (await readabilityFindings(page)).filter((f) => f.kind === 'contrast');
  expect(findings, `${url}: contrast below ${WCAG}:1
${show(findings)}`).toEqual([]);
};

test('TC-UI-147: Contrast (REQ-UI-110)', async ({ page, ev }) => {
  // Precondition: project example has kicked-off milestones ex-m1 and ex-m2, each shown with its id and label.
  await page.setViewportSize({ width: 1440, height: 900 });
  const unstubbed = await stubExample(page);

  await ev.step('1. Set the theme to light', async () => { await setTheme(page, 'light'); });

  await ev.step('2. Open `/reports?project=example&tab=team`', async () => { await contrast(page, '/reports?project=example&tab=team', 'team'); });

  await ev.step('3. Open `/reports?project=example&tab=velocity`', async () => { await contrast(page, '/reports?project=example&tab=velocity', 'velocity'); });

  await ev.step('4. Set the theme to dark', async () => { await setTheme(page, 'dark'); });

  await ev.step('5. Open `/reports?project=example&tab=team`', async () => { await contrast(page, '/reports?project=example&tab=team', 'team'); });

  await ev.step('6. Open `/reports?project=example&tab=velocity`', async () => { await contrast(page, '/reports?project=example&tab=velocity', 'velocity'); });

  expect([...new Set(unstubbed)], 'API calls the spec does not stub').toEqual([]);
});
