// REQ-UI-110 scenarios "No overlapping text" and "Contrast": every page, at four widths and in both
// themes, has no text over other visible text or a shape, no text spilling out of its box, and no text
// below WCAG contrast. The data (support/example.ts) is shaped like the example project: long titles and ids, points, a
// kicked-off milestone with velocity, a milestone past its end, Reports with long member names.
import { test, expect } from '../evidence';
import { LONG_ID, stubExample, text, heading, scrollGantt, beadsView, report_, gantt, type Visit } from '../support/example';
import { readabilityFindings, show } from '../support/readability';

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const THEMES = ['light', 'dark'] as const;

const groups: Record<string, Visit[]> = {
  'beads views': ['list', 'board', 'focus', 'graph'].map(beadsView),
  'beads lanes': [
    { name: 'beads lanes', url: '/beads?project=example&milestone=all&view=lanes&scope=ex-e12', ready: async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); } },
    { name: 'beads graph lanes', url: '/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1', ready: async (page) => { await expect(page.locator('section[data-lane]').first()).toBeVisible(); await expect(page.locator('[data-chip]').first()).toBeVisible(); } },
    { name: 'bead lane track', url: '/beads/example/ex-e12.2', ready: heading('Track 2') },
    { name: 'bead merge gate', url: '/beads/example/ex-e12.9', ready: heading(/Waits for be #2 to merge/) },
  ],
  'beads with a panel': [
    { name: 'beads list panel', url: '/beads?project=example&milestone=all&view=list&select=ex-e3', ready: text('Billing exports for finance') },
    { name: 'beads board panel', url: '/beads?project=example&milestone=all&view=board&select=ex-e3', ready: text('Billing exports for finance') },
    { name: 'beads graph panel', url: '/beads?project=example&milestone=all&view=graph&select=ex-e3', ready: text('Billing exports for finance') },
  ],
  'bead pages': [
    { name: 'bead epic', url: '/beads/example/ex-e3', ready: heading(/Billing exports/) },
    { name: 'bead long id', url: `/beads/example/${LONG_ID}`, ready: heading(/Payments provider migration/) },
    { name: 'bead task', url: '/beads/example/ex-e3.1', ready: heading(/Export CSV/) },
    // REQ-UI-119..122: the epic page of ex-e12 on Overview, on Graph with closed tracks and on Lanes
    { name: 'epic overview', url: '/beads/example/ex-e12', ready: async (page) => { await expect(page.getByRole('region', { name: 'Tracks' })).toBeVisible(); await expect(page.getByRole('region', { name: 'Lanes' })).toBeVisible(); await expect(page.getByText(/^Loading/)).toHaveCount(0); } },
    { name: 'epic graph', url: '/beads/example/ex-e12?tab=graph&closed=1', ready: async (page) => { await expect(page.locator('section[data-lane]').first()).toBeVisible(); await expect(page.locator('[data-chip]').first()).toBeVisible(); } },
    { name: 'epic lanes', url: '/beads/example/ex-e12?tab=lanes', ready: async (page) => { await expect(page.getByTestId('lanes-canvas')).toBeVisible(); await expect(page.locator('[data-marker]').first()).toBeVisible(); } },
  ],
  'my work': [{ name: 'my work', url: '/my-tasks?project=example', ready: async (page) => { await expect(page.getByRole('link', { name: /Track 7/ }).first()).toBeVisible(); } }],
  milestones: [{ name: 'milestones', url: '/milestones?project=example', ready: text('General availability') }],
  'gantt 1w and 2w': ['1w', '2w'].map(gantt),
  'gantt all and scrolled': [
    gantt('all'),
    { ...gantt('1w'), name: 'gantt 1w scrolled middle', after: scrollGantt(0.5) },
    { ...gantt('2w'), name: 'gantt 2w scrolled end', after: scrollGantt(1) },
    { ...gantt('all'), name: 'gantt all past end', url: '/milestones/example/ex-m1?tab=gantt&zoom=all' },
  ],
  'milestone tabs': [
    { name: 'milestone beads', url: '/milestones/example/ex-m2?tab=beads', ready: text('Billing exports for finance') },
    { name: 'milestone retro', url: '/milestones/example/ex-m1?tab=retro', ready: text('Went well') },
  ],
  'reports team and delivery': [report_('team'), report_('delivery')],
  'reports velocity and quality': [report_('velocity'), report_('quality')],
};

for (const [group, visits] of Object.entries(groups)) {
  test(`REQ-UI-110: ${group} are readable at every width and theme`, async ({ page, ev }) => {
    void ev; // signs in (REQ-UI-097)
    test.setTimeout(240_000);
    await page.addInitScript(() => { if (!localStorage.getItem('gin-console-theme')) localStorage.setItem('gin-console-theme', 'light'); });
    const unstubbed = await stubExample(page);
    const failures: string[] = [];
    for (const visit of visits) {
      for (const size of WIDTHS) {
        await page.setViewportSize(size);
        await page.goto(visit.url);
        await visit.ready(page);
        for (const theme of THEMES) {
          if (theme === 'dark') {
            await page.evaluate(() => localStorage.setItem('gin-console-theme', 'dark'));
            await page.reload();
            await visit.ready(page);
              }
          await visit.after?.(page);
          const findings = await readabilityFindings(page);
          if (findings.length) failures.push(`${visit.name} @${size.width} ${theme}: ${findings.length} finding(s)\n${show(findings)}`);
        }
        await page.evaluate(() => localStorage.setItem('gin-console-theme', 'light'));
      }
    }
    expect([...new Set(unstubbed)], 'API calls the spec does not stub').toEqual([]);
    expect(failures, failures.join('\n\n')).toEqual([]);
  });
}

test('REQ-UI-110 REQ-UI-107: a wide table scrolls in its own box while a long URL wraps', async ({ page, ev }) => {
  void ev;
  await stubExample(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/beads/example/ex-e3.1');
  await expect(page.locator('.markdown table').first()).toBeVisible();
  const m = await page.evaluate(() => {
    const t = document.querySelector('.markdown table') as HTMLElement;
    return { overflows: t.scrollWidth > t.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(m.overflows).toBe(true);
  expect(m.page).toBeLessThanOrEqual(0);
  expect(await readabilityFindings(page)).toEqual([]);
});
