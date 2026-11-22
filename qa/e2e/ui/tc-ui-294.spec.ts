// TC: TC-UI-294@01f241dc
import { test, expect } from '../evidence';
import { stubProject, taskOf } from '../support/graph';

test('TC-UI-294: Blocked card shows the knot and no coloured edge', async ({ page, ev }) => {
  // Precondition: P reports a blocked task p-1 titled "Blocked work" (open, with an open blocker p-0). Light theme: amber is #AE500A.
  await page.emulateMedia({ colorScheme: 'light' });
  await stubProject(page, 'P', [
    taskOf('p-0', null, [], { title: 'The blocker', ready: true }),
    taskOf('p-1', null, ['p-0'], { title: 'Blocked work' }),
  ]);

  await ev.step('1. Open `/beads?project=P&view=board`', async () => {
    await page.goto('/beads?project=P&view=board');
    await expect(page.getByRole('link', { name: 'Blocked work' })).toBeVisible();
  });

  await ev.step('2. Find the card of `p-1`', async () => {
    const card = page.locator('[data-card][data-id="p-1"]');
    await expect(card).toBeVisible();
    // "Blocked" after the knot glyph: a full bead crossed by a short bar
    const mark = card.locator('[data-state="blocked"]');
    await expect(mark).toHaveText('Blocked');
    const glyph = mark.locator('svg[data-glyph="blocked"]');
    await expect(glyph).toBeVisible();
    await expect(glyph.locator('circle')).toHaveCount(1);
    await expect(glyph.locator('path')).toHaveCount(1);
    // in the amber of the theme
    await expect(glyph.locator('circle')).toHaveCSS('fill', 'rgb(174, 80, 10)');
    await expect(mark).toHaveCSS('color', 'rgb(174, 80, 10)');
    // no coloured left edge: border-left colour equals the other border colours
    const borders = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return { left: s.borderLeftColor, top: s.borderTopColor, right: s.borderRightColor, bottom: s.borderBottomColor, width: s.borderLeftWidth };
    });
    expect(borders.left).toBe(borders.top);
    expect(borders.left).toBe(borders.right);
    expect(borders.left).toBe(borders.bottom);
    expect(borders.left).not.toBe('rgb(174, 80, 10)');
  });
});
