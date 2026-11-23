// TC: TC-UI-145@a8ae6db7
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';
import { e12, milestoneOptions } from '../support/lanes';
import { beadsOf, stubBeadPages } from '../support/shell';

// The colours the page paints with `text-muted-foreground` and `text-foreground`, and the weight of a label.
const palette = (page: Page) =>
  page.evaluate(() => {
    const paint = (cls: string) => {
      const el = document.createElement('span');
      el.className = cls;
      document.body.append(el);
      const color = getComputedStyle(el).color;
      el.remove();
      return color;
    };
    return { muted: paint('text-muted-foreground'), text: paint('text-foreground') };
  });

/** Each fact `label` of `scope`: the label in the muted colour, the value in the text colour and heavier. */
async function expectFacts(page: Page, scope: Locator, labels: string[]) {
  const { muted, text } = await palette(page);
  expect(muted).not.toBe(text);
  for (const label of labels) {
    const fact = scope.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });
    // soft: a missing fact is reported and the remaining facts and pages are still checked
    await expect.soft(fact, `fact ${label}`).toHaveCount(1);
    if ((await fact.count()) !== 1) continue;
    const style = await fact.evaluate((el) => {
      const dt = getComputedStyle(el.querySelector('dt')!);
      const dd = getComputedStyle(el.querySelector('dd')!);
      return { dtColor: dt.color, dtWeight: Number(dt.fontWeight), ddColor: dd.color, ddWeight: Number(dd.fontWeight) };
    });
    expect(style.dtColor, `${label}: label colour`).toBe(muted);
    expect(style.ddColor, `${label}: value colour`).toBe(text);
    expect(style.ddWeight, `${label}: value weight over label weight`).toBeGreaterThan(style.dtWeight);
    expect(style.ddWeight, `${label}: value weight`).toBeGreaterThanOrEqual(500);
  }
}

test('TC-UI-145: Facts as label and value (REQ-UI-110)', async ({ page, ev }) => {
  // Precondition: alpha/e-3 has owner lead@example.com, assignee bao and 0 comments; P/M1 is kicked off with a velocity line; lane `be` of ex-e12 in example has a header and a claim expiring tomorrow.
  await page.setViewportSize({ width: 1440, height: 900 });
  const e3 = bead('e-3', { title: 'Billing exports', issue_type: 'epic', owner: 'lead@example.com', assignee: 'bao', created_by: 'lead@example.com', comment_count: 0 });
  const byProject = { alpha: [e3], example: e12() };
  const velocity = { committed_points: 40, completed_points: 31, added_points: 6, say_do: 0.78, days_per_point: 1.4, planned_days_per_point: 1.2, accuracy: 0.86 };
  const m1 = { ...detail([epicPlan('p-1')], { id: 'M1', title: 'First milestone', status: 'active', kickoff: '2026-11-02', today: '2026-11-12' }), lanes: 2, integration: null, deadline: null, away: {}, days_per_point: null, velocity };
  await stubApi(page, {
    projects: ['alpha', 'P', 'example'],
    beads: beadsOf({ ...byProject, P: [] }),
    milestone: { M1: m1 },
    milestoneOptions: (url) => (url.searchParams.get('project') === 'example' ? milestoneOptions : { milestones: [], current: null }),
  });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open `/beads/alpha/e-3`', async () => {
    await page.goto('/beads/alpha/e-3');
    await expect(page.getByRole('heading', { name: 'Billing exports' })).toBeVisible();
    await expectFacts(page, page.locator('main header'), ['Assignee', 'Created by', 'Created', 'Updated', 'Comments']);
    await expect(page.locator('main header dt', { hasText: /^Owner$/ }), 'no Owner fact').toHaveCount(0);
  });

  await ev.step('2. Open `/milestones/P/M1`', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('heading', { name: 'First milestone' })).toBeVisible();
    await expectFacts(page, page.locator('main'), ['Committed', 'Completed', 'Added', 'Commitment met', 'Days per point']);
  });

  await ev.step('3. Open `/beads?project=example&view=lanes&scope=ex-e12`', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    const be = page.getByRole('region', { name: 'Lane be' });
    await expect(be).toBeVisible();
    await expectFacts(page, be, ['State', 'Held by', 'Lease', 'Tracks']);
  });
});
