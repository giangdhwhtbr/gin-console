// TC: TC-UI-368@df204e9a
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-368: Board with a panel', async ({ page, ev }) => {
  // Precondition: the Board of project example at 1440px wide, URL has select=t-1.
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 }), bead('t-2', { title: 'Send reminders', ready: true })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&milestone=all&view=board&select=t-1');
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Pay invoices' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Open page' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Close details' })).toBeVisible();
    await expect(panel.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
    // the panel is a third of the width; the columns stay left of it
    const box = (await panel.boundingBox())!;
    const grid = (await panel.evaluateHandle((el) => el.parentElement!)).asElement()!;
    const gridBox = (await grid.boundingBox())!;
    expect(box.width / gridBox.width).toBeGreaterThan(0.28);
    expect(box.width / gridBox.width).toBeLessThan(0.38);
    for (const id of ['t-1', 't-2']) {
      const card = (await page.locator(`[data-card][data-id="${id}"]`).boundingBox())!;
      expect(card.x + card.width).toBeLessThanOrEqual(box.x);
    }
  });
});
