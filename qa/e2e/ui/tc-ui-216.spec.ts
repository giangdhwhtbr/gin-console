// TC: TC-UI-216@4658b5be
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { panelOf, stubProject } from '../support/graph';

test('TC-UI-216: Long bead in a panel (REQ-UI-078)', async ({ page, ev }) => {
  // Precondition: project p has bead p-1 whose content is taller than the 1440x900 window, among enough beads that the page itself scrolls.
  const beads = [bead('p-1', { title: 'Long bead' }), ...Array.from({ length: 40 }, (_, i) => bead(`q-${i + 1}`))];
  await stubProject(page, 'p', beads);
  const long = Array.from({ length: 120 }, (_, i) => `Paragraph ${i + 1} of the description.`).join('\n\n');
  // Registered after stubProject, so it answers p-1 with a long description.
  await page.route(/\/api\/beads\/p\/p-1$/, (route) =>
    route.fulfill({
      json: { ...beads[0], description: long, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open `/beads?project=p&view=list`', async () => {
    await page.goto('/beads?project=p&view=list');
    await expect(page.getByRole('treeitem', { name: /p-1/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  });

  await ev.step('2. Select `p-1`', async () => {
    const row = page.getByRole('treeitem', { name: /p-1/ });
    const box = (await row.boundingBox())!;
    await row.click({ position: { x: box.width - 12, y: box.height / 2 } });
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(panelOf(page).getByRole('heading', { name: 'Long bead' })).toBeVisible();
    await expect(panelOf(page).getByText('Paragraph 120 of the description.')).toBeAttached();
  });

  await ev.step('3. Turn the wheel down over the details panel', async () => {
    const box = (await panelOf(page).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 300));
    await page.mouse.wheel(0, 400);
    await expect.poll(() => panelOf(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
