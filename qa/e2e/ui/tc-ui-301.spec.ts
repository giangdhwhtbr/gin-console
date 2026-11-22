// TC: TC-UI-301@fa6bee89
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-301: Fonts served by the console', async ({ page, ev }) => {
  // Preconditions: P reports a bead; every request to a host other than the console (127.0.0.1:8701) is aborted.
  await stubApi(page, { projects: ['P'], beads: [bead('p-1', { title: 'Write the docs', ready: true })] });
  const foreign: string[] = [];
  const fonts: string[] = [];
  await page.route(
    (url) => url.host !== '127.0.0.1:8701' && url.protocol.startsWith('http'),
    (route) => {
      foreign.push(route.request().url());
      return route.abort();
    },
  );
  page.on('response', (response) => {
    if (response.request().resourceType() === 'font') fonts.push(response.url());
  });

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Write the docs' })).toBeVisible();
  });

  await ev.step('2. Wait for the fonts to load (`document.fonts.ready`)', async () => {
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // the Recursive file is answered by the console itself
    await expect.poll(() => fonts.length).toBeGreaterThan(0);
    expect(fonts.every((url) => new URL(url).host === '127.0.0.1:8701')).toBe(true);
    expect(fonts.some((url) => /recursive/i.test(url))).toBe(true);
    expect(foreign).toEqual([]);
  });

  await ev.step('3. Check that the font Recursive is loaded (`document.fonts.check("14px Recursive")`)', async () => {
    expect(await page.evaluate(() => document.fonts.check('14px Recursive'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('14px "Recursive Variable"'))).toBe(true);
    // the family is named "Recursive Variable" by the package; a loaded face of it must exist
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
    expect(loaded.some((family) => family.includes('Recursive'))).toBe(true);
  });
});
