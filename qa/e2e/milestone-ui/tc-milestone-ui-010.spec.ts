// TC: TC-MILESTONE-UI-010@d3f7eb86
import { test, expect } from '../evidence';
import type { Locator } from '@playwright/test';
import { detail, epicPlan, stubApi } from '../support/api';

// The bars and legend swatches are aria-hidden drawings: compare their computed paint.
const paint = (l: Locator) =>
  l.evaluate((el) => {
    const s = getComputedStyle(el);
    return { background: s.backgroundColor, image: s.backgroundImage, border: `${s.borderTopWidth} ${s.borderTopColor}`, opacity: s.opacity };
  });

test('TC-MILESTONE-UI-010: Bars colored by bead status', async ({ page, ev }) => {
  // Precondition: M1 holds epic A closed, epic B in progress and epic C open, one after another.
  await stubApi(page, {
    milestone: {
      M1: detail(
        [
          epicPlan('A', { title: 'Epic A', status: 'closed', estimate_days: 3, planned_start: '2026-11-02', planned_end: '2026-11-04' }),
          epicPlan('B', { title: 'Epic B', status: 'in_progress', estimate_days: 3, planned_start: '2026-11-05', planned_end: '2026-11-09', depends_on: ['A'] }),
          epicPlan('C', { title: 'Epic C', status: 'open', estimate_days: 3, planned_start: '2026-11-10', planned_end: '2026-11-12', depends_on: ['B'] }),
        ],
        { finish: '2026-11-12' },
      ),
    },
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('tab', { name: 'Gantt' })).toHaveAttribute('aria-selected', 'true');
    const epics = page.getByRole('list', { name: 'Epics' });
    const legend = page.getByRole('list', { name: 'Legend' });
    const cases = [
      { id: 'A', label: 'Closed', days: ['2026-11-02', '2026-11-03', '2026-11-04'] },
      { id: 'B', label: 'In progress', days: ['2026-11-05', '2026-11-06', '2026-11-09'] },
      { id: 'C', label: 'Open', days: ['2026-11-10', '2026-11-11', '2026-11-12'] },
    ];
    const paints: string[] = [];
    for (const c of cases) {
      const row = epics.getByRole('listitem').filter({ has: page.getByRole('link', { name: c.id, exact: true }) });
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('img', { name: c.label })).toBeVisible();
      // One bar: a bead per working day from planned_start to planned_end.
      const beads = row.locator('[data-bead]');
      await expect(beads).toHaveCount(c.days.length);
      expect(await beads.evaluateAll((els) => els.map((e) => e.getAttribute('data-bead')))).toEqual(c.days);
      // Its color is the legend swatch of its status.
      const swatch = legend.getByRole('listitem').filter({ hasText: new RegExp(`^${c.label}$`) }).locator('span');
      const want = await paint(swatch);
      for (const bead of await beads.all()) expect(await paint(bead)).toEqual(want);
      paints.push(JSON.stringify(want));
    }
    expect(new Set(paints).size).toBe(3);
  });
});
