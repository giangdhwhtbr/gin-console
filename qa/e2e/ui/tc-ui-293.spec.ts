// TC: TC-UI-293@7da38339
import type { Page } from '@playwright/test';
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

type Rgb = [number, number, number];

// WCAG 2.x relative luminance and contrast ratio
const lum = ([r, g, b]: Rgb) => {
  const c = [r, g, b].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const parse = (css: string): Rgb => {
  const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(css);
  if (!m) throw new Error(`not an rgb colour: ${css}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** The colour of each custom property as rgb (the built stylesheet may write #fff for #FFFFFF). */
const resolveTokens = (page: Page, names: string[]) =>
  page.evaluate((props) => {
    const style = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const p of props) {
      let hex = style.getPropertyValue(p).trim().replace('#', '');
      if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
      out[p] = `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`;
    }
    return out;
  }, names);

const SURFACES = { page: '--background', paper: '--card', sunk: '--muted' };
const TEXT = { graphite: '--foreground', slate: '--muted-foreground' };
const STATES = { ready: '--state-ready', 'in progress': '--state-progress', blocked: '--state-blocked', done: '--state-done', deferred: '--state-deferred' };
const OTHERS = { identity: '--identity', carnelian: '--type-bug' };

test('TC-UI-293: Contrast of text, state colours and control outlines', async ({ page, ev }) => {
  // Preconditions: P reports one bead of each state, one bug and the lane be.
  await stubApi(page, {
    projects: ['P'],
    beads: [
      bead('p-1', { title: 'Ready work', ready: true, priority: 0, lane: 'be', labels: ['lane:be'] }),
      bead('p-2', { title: 'Working', status: 'in_progress', priority: 1 }),
      bead('p-3', { title: 'Blocked work', blocked: true, blocked_by: ['p-1'], dependency_count: 1 }),
      bead('p-4', { title: 'Done work', status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
      bead('p-5', { title: 'Deferred work', status: 'deferred' }),
      bead('p-6', { title: 'A bug', issue_type: 'bug', ready: true }),
    ],
  });

  const measure = async (theme: 'light' | 'dark') => {
    await page.goto('/beads?project=P&view=list&closed=1');
    await expect(page.getByRole('treeitem')).toHaveCount(6);
    if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
    else await expect(page.locator('html')).not.toHaveClass(/dark/);

    // text, the state colours, the identity colour and carnelian against page, paper and sunk: at least 4.5:1
    const all = { ...SURFACES, ...TEXT, ...STATES, ...OTHERS };
    const rgb = Object.fromEntries(Object.entries(await resolveTokens(page, Object.values(all))).map(([k, v]) => [k, parse(v)]));
    const low: string[] = [];
    for (const [name, prop] of Object.entries({ ...TEXT, ...STATES, ...OTHERS })) {
      for (const [surface, sprop] of Object.entries(SURFACES)) {
        const ratio = contrast(rgb[prop], rgb[sprop]);
        if (ratio < 4.5) low.push(`${theme}: ${name} on ${surface} is ${ratio.toFixed(2)}:1`);
      }
    }
    expect(low, 'text colours below 4.5:1').toEqual([]);
    return rgb;
  };

  const strokes = async (theme: string) => {
    // glyph strokes (and fills) of every state glyph against the surface behind them: at least 3:1
    const glyphs = await page.locator('svg[data-glyph]').evaluateAll((svgs) =>
      svgs.map((svg) => {
        const shape = svg.querySelector('circle') as SVGElement;
        const s = getComputedStyle(shape);
        let surface = svg.parentElement;
        while (surface && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
        return { state: svg.getAttribute('data-glyph'), color: s.stroke !== 'none' ? s.stroke : s.fill, surface: surface ? getComputedStyle(surface).backgroundColor : 'rgb(255, 255, 255)' };
      }),
    );
    expect(glyphs.length).toBeGreaterThanOrEqual(5);
    const low = glyphs.filter((g) => contrast(parse(g.color), parse(g.surface)) < 3).map((g) => `${theme}: glyph ${g.state} ${g.color} on ${g.surface}`);
    expect(low, 'glyph strokes below 3:1').toEqual([]);
    // the outline of the search input, a plain filter button, a chosen chip and "More filters" against the page: at least 3:1
    const outline = (sel: string) =>
      page.evaluate((selector) => {
        const el = document.querySelector(selector)!;
        const box = el.closest('[class*="rounded-md border"]') ?? el;
        const alpha = (c: string) => { const m = /rgba?\(([^)]+)\)/.exec(c)!; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { rgb: v.slice(0, 3), a: v[3] ?? 1 }; };
        const page = alpha(getComputedStyle(document.body).backgroundColor).rgb;
        const border = alpha(getComputedStyle(box).borderTopColor);
        const over = border.rgb.map((c, i) => Math.round(c * border.a + page[i] * (1 - border.a)));
        return { color: `rgb(${over.join(', ')})`, page: `rgb(${page.join(', ')})`, width: getComputedStyle(box).borderTopWidth };
      }, sel);
    const plain = page.getByRole('button', { name: 'Status', exact: true });
    await expect(plain).toBeVisible();
    await plain.evaluate((el) => el.setAttribute('data-tc293', 'plain'));
    const more = page.getByRole('button', { name: 'More filters' });
    await more.evaluate((el) => el.setAttribute('data-tc293', 'more'));
    const controls = { 'search input': await outline('#bead-search'), 'plain filter button': await outline('[data-tc293="plain"]'), 'More filters': await outline('[data-tc293="more"]') };
    // a chosen chip: the same Status filter with a value
    await page.goto('/beads?project=P&view=list&closed=1&status=open');
    const chosen = page.getByRole('button', { name: /^Status open/ });
    await expect(chosen).toBeVisible();
    await chosen.evaluate((el) => el.setAttribute('data-tc293', 'chosen'));
    Object.assign(controls, { 'chosen chip': await outline('[data-tc293="chosen"]') });
    for (const [name, c] of Object.entries(controls)) {
      expect(c.width, `${theme}: outline of the ${name} is drawn`).not.toBe('0px');
      expect(contrast(parse(c.color), parse(c.page)), `${theme}: outline of the ${name} (${c.color} on ${c.page})`).toBeGreaterThanOrEqual(3);
    }
  };

  const priority = async () => {
    // priority is told by weight only: P0 and P1 share the colour of their row text
    for (const [id, p] of [['p-1', 'P0'], ['p-2', 'P1']]) {
      const row = page.locator(`[role="treeitem"][data-id="${id}"]`);
      const mark = row.getByText(p, { exact: true });
      await expect(mark).toBeVisible();
      const rowText = await row.getByRole('link').evaluate((el) => getComputedStyle(el).color);
      expect(await mark.evaluate((el) => getComputedStyle(el).color)).toBe(rowText);
      expect(Number(await mark.evaluate((el) => getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(600);
    }
  };

  await ev.step('1. Set the light theme', async () => {
    await page.emulateMedia({ colorScheme: 'light' });
  });

  await ev.step('2. Open `/beads?project=P&view=list` (with closed beads shown)', async () => {
    await page.goto('/beads?project=P&view=list&closed=1');
    await expect(page.getByRole('treeitem')).toHaveCount(6);
  });

  await ev.step('3. Measure the contrast of the text colours, the state colours, the identity colour and carnelian against page, paper and sunk', async () => {
    await measure('light');
    await priority();
  });

  await ev.step('4. Measure the contrast of the state glyph strokes against their surface, and the outline of the search input, a plain filter button (Status), a chosen chip (Status with a value) and "More filters" against the page', async () => {
    await strokes('light');
  });

  await ev.step('5. Set the dark theme', async () => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  await ev.step('6. Repeat steps 2 to 4', async () => {
    await measure('dark');
    await priority();
    await strokes('dark');
  });
});
