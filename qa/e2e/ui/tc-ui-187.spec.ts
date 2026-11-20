// TC: TC-UI-187@c50605ed
import { test, expect } from '../evidence';
import { e12, E12, graphGeometry, openGraph, showClosed, stubExample } from '../support/lanes';

test('TC-UI-187: No lane box', async ({ page, ev }) => {
  // Precondition: ex-e12 has two tracks without a lane, track 7 closed and track 8 open.
  const beads = e12().map((b) => (b.id === `${E12}.7` ? { ...b, status: 'closed', ready: false, closed_at: '2026-11-10T00:00:00Z' } : b));
  await stubExample(page, beads);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    await expect(page.locator(`[data-node="${E12}.7"]`)).toHaveCount(0);
  });

  await ev.step('2. Turn "Show closed" on', async () => {
    await showClosed(page);
    const none = page.getByRole('region', { name: 'Lane No lane' });
    await expect(none).toHaveClass(/border-dashed/);
    // the two cards are inside the box
    await expect(page.locator(`[data-node="${E12}.7"]`)).toBeVisible();
    await expect(page.locator(`[data-node="${E12}.8"]`)).toBeVisible();
    const g = await graphGeometry(page);
    for (const id of [`${E12}.7`, `${E12}.8`]) {
      const card = g.cards[id];
      expect(card.x).toBeGreaterThanOrEqual(g.boxes[''].x);
      expect(card.x + card.w).toBeLessThanOrEqual(g.boxes[''].x + g.boxes[''].w);
      expect(card.y).toBeGreaterThanOrEqual(g.boxes[''].y);
      expect(card.y + card.h).toBeLessThanOrEqual(g.boxes[''].y + g.boxes[''].h);
    }
    const header = none.locator('header');
    await expect(header).toHaveText(/^No lane\s*1\/2 closed$/);
    await expect(header.locator('[data-swatch]')).toHaveCount(0);
    await expect(header.locator('> div').getByRole('heading')).toHaveText('No lane');
    await expect(header.locator('> div > *')).toHaveCount(1);
  });
});
