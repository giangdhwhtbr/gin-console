// TC: TC-UI-300@0327a1e9
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-300: One family, two voices', async ({ page, ev }) => {
  // Preconditions: P reports a task p-1 titled "Write the docs"; every request the page makes is recorded.
  await stubApi(page, { projects: ['P'], beads: [bead('p-1', { title: 'Write the docs', ready: true })] });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  const style = (selector: string) =>
    page.locator(selector).evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, variation: s.fontVariationSettings };
    });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Write the docs' })).toBeVisible();
  });

  await ev.step('2. Read the computed `font-family` and `font-variation-settings` of the page body', async () => {
    const body = await style('body');
    expect(body.family).toMatch(/^"?Recursive/);
    expect(body.variation).toContain('"MONO" 0');
  });

  await ev.step('3. Read the computed `font-family` and `font-variation-settings` of the id of `p-1`', async () => {
    const id = await style('[role="treeitem"][data-id="p-1"] span[title="p-1"]');
    expect(id.family).toMatch(/^"?Recursive/);
    expect(id.variation).toContain('"MONO" 1');
    // no request for a Geist font file
    await page.evaluate(() => document.fonts.ready);
    expect(requests.filter((url) => /geist/i.test(url))).toEqual([]);
  });
});
