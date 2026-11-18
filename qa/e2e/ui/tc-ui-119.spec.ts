// TC: TC-UI-119@049674b5
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const DESCRIPTION = [
  '| Column one heading | Column two heading | Column three heading | Column four heading | Column five heading |',
  '| --- | --- | --- | --- | --- |',
  '| first wide cell value | second wide cell value | third wide cell value | fourth wide cell value | fifth wide cell value |',
  '',
  '```',
  'const veryLongLine = computeSomethingThatNeverWrapsBecauseItIsOneVeryLongCodeLine(argumentNumberOne, argumentNumberTwo, argumentNumberThree);',
  '```',
].join('\n');

test('TC-UI-119: Wide table on a phone', async ({ page, ev }) => {
  // Precondition: alpha has t-1 whose description holds a five-column wide table and a long code line; the window is 390px wide.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1')] });
  await page.route('**/api/beads/alpha/t-1', (route) =>
    route.fulfill({
      json: {
        ...bead('t-1'),
        description: DESCRIPTION, design: null, notes: null, acceptance_criteria: null, close_reason: null,
        dependencies: [], dependents: [], bugs: [], children: [],
      },
    }),
  );
  await page.route('**/api/beads/alpha/t-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open /beads/alpha/t-1', async () => {
    await page.goto('/beads/alpha/t-1');
    const table = page.getByRole('table');
    const code = page.locator('.markdown pre');
    await expect(table).toBeVisible();
    await expect(code).toBeVisible();
    // The table and the code block scroll inside their own boxes.
    for (const box of [table, code]) {
      const m = await box.evaluate((el) => ({ s: el.scrollWidth, c: el.clientWidth, o: getComputedStyle(el).overflowX }));
      expect(m.s).toBeGreaterThan(m.c);
      expect(m.o).toBe('auto');
      const b = (await box.boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(390);
    }
    // The page does not scroll sideways.
    const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(w.s).toBeLessThanOrEqual(w.c);
  });
});
