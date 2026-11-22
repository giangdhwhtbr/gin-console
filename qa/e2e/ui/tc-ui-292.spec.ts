// TC: TC-UI-292@71b3d767
import { test, expect } from '../evidence';
import { bead, detail, entry, epicPlan, list, stubApi } from '../support/api';
import { reportBody, teamBody } from '../support/reports';

const JADE = { light: 'rgb(14, 122, 92)', dark: 'rgb(69, 207, 159)' }; // #0E7A5C, #45CF9F

test('TC-UI-292: Done is jade in both themes', async ({ page, ev }) => {
  // Preconditions: P reports a closed task p-1 and an open task p-2; milestone M1 with a closed epic p-e1 and an open epic p-e2;
  // the Team scope of Reports reports a closed share of beads (1 of 4).
  await stubApi(page, {
    projects: ['P'],
    beads: [
      bead('p-1', { title: 'Closed task', status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
      bead('p-2', { title: 'Open task', ready: true }),
    ],
    milestones: list([entry('M1', { title: 'Beta readiness', status: 'active', start: '2026-11-02', end: '2026-11-13' })]),
    milestone: {
      M1: detail([
        epicPlan('p-e1', { title: 'Closed epic', status: 'closed' }),
        epicPlan('p-e2', { title: 'Open epic', status: 'open', planned_start: '2026-11-05', planned_end: '2026-11-09' }),
      ]),
    },
  });
  await page.route('**/api/reports/team**', (route) => route.fulfill({ json: teamBody('P', { closed: 1, scope: 4 }) }));
  await page.route(/\/api\/reports\?/, (route) => route.fulfill({ json: reportBody('P') }));

  // Each reading is the colour of "done" in one of the three places.
  const readBeads = async () => {
    await page.goto('/beads?project=P&view=list&closed=1');
    const glyph = page.locator('[role="treeitem"][data-id="p-1"] svg[data-glyph="done"] circle');
    await expect(glyph).toBeVisible();
    return glyph.evaluate((el) => getComputedStyle(el).fill);
  };
  const readGantt = async () => {
    await page.goto('/milestones/P/M1');
    const bar = page.locator('[data-bar="p-e1"]');
    await expect(bar).toBeVisible();
    return bar.evaluate((el) => getComputedStyle(el).backgroundColor);
  };
  const readTeam = async () => {
    await page.goto('/reports?project=P&tab=team');
    const done = page.locator('section:has(h2:text-is("Scope by status")) [data-strand] [data-shape="done"] circle');
    await expect(done).toHaveCount(1);
    return done.evaluate((el) => getComputedStyle(el).fill);
  };

  await ev.step('1. Set the light theme', async () => {
    await page.emulateMedia({ colorScheme: 'light' });
  });

  await ev.step('2. Open `/beads?project=P&view=list` (with closed beads shown)', async () => {
    await page.goto('/beads?project=P&view=list&closed=1');
    await expect(page.locator('[role="treeitem"][data-id="p-1"]')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  await ev.step('3. Read the colour of the state glyph of `p-1`', async () => {
    expect(await readBeads()).toBe(JADE.light);
  });

  await ev.step('4. Open `/milestones/P/M1`', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.locator('[data-bar="p-e1"]')).toBeVisible();
  });

  await ev.step('5. Read the colour of the bar of the closed epic `p-e1` on the Gantt', async () => {
    expect(await readGantt()).toBe(JADE.light);
  });

  await ev.step('6. Open `/reports?project=P&tab=team`', async () => {
    await page.goto('/reports?project=P&tab=team');
    await expect(page.getByRole('heading', { name: 'Scope by status' })).toBeVisible();
  });

  await ev.step('7. Read the colour of the closed part of the Team scope bar', async () => {
    expect(await readTeam()).toBe(JADE.light);
  });

  await ev.step('8. Set the dark theme', async () => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  await ev.step('9. Repeat steps 2 to 7', async () => {
    expect(await readBeads()).toBe(JADE.dark);
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await readGantt()).toBe(JADE.dark);
    expect(await readTeam()).toBe(JADE.dark);
  });
});
