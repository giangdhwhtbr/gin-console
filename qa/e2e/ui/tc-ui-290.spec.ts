// TC: TC-UI-290@eafc412e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

// The case names the tokens page, paper, sunk, rule, graphite, slate, amethyst, jade, lapis, amber, hematite, carnelian;
// the frontend stylesheet (frontend/src/index.css) defines them as these custom properties.
const TOKENS: Record<string, string> = {
  page: '--background', paper: '--card', sunk: '--muted', rule: '--border', graphite: '--foreground', slate: '--muted-foreground',
  amethyst: '--identity', jade: '--state-ready', lapis: '--state-progress', amber: '--state-blocked', hematite: '--state-deferred', carnelian: '--type-bug',
};

test('TC-UI-290: Light palette values', async ({ page, ev }) => {
  // Preconditions: P reports a bead; the light theme is on.
  await page.emulateMedia({ colorScheme: 'light' });
  await stubApi(page, { projects: ['P'], beads: [bead('p-1', { ready: true })] });
  let read: Record<string, string> = {};

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Title p-1' })).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  await ev.step('2. Read the colour tokens of the document element', async () => {
    read = await page.evaluate((tokens) => {
      // the built stylesheet may shorten #FFFFFF to #fff: expand to six upper-case digits
      const hex = (v: string) => {
        const t = v.trim().toUpperCase();
        return /^#[0-9A-F]{3}$/.test(t) ? `#${[...t.slice(1)].map((c) => c + c).join('')}` : t;
      };
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(Object.entries(tokens).map(([name, prop]) => [name, hex(style.getPropertyValue(prop))]));
    }, TOKENS);
    expect(read).toMatchObject({ page: '#F4F5F8', paper: '#FFFFFF', sunk: '#ECEEF3', rule: '#DDE0E7' });
    expect(read).toMatchObject({ graphite: '#1B1D26', slate: '#596072' });
    expect(read).toMatchObject({ amethyst: '#6A3DB8', jade: '#0E7A5C', lapis: '#2557D6', amber: '#AE500A', hematite: '#646A78', carnelian: '#B42318' });
  });
});
