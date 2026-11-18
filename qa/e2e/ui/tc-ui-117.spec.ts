// TC: TC-UI-117@82d0ab7d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const TITLE = 'Handle PaymentReconciliationServiceTimeoutExceptionHandlerFactoryProviderBean in the worker';

test('TC-UI-117: Unbroken title on a card', async ({ page, ev }) => {
  // Precondition: alpha has a bead with an unbroken long word in its title; the window is 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1', { title: TITLE, ready: true })] });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=board', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const link = page.getByRole('link', { name: TITLE });
    await expect(link).toBeVisible();
    // The title wraps inside its card.
    const card = page.locator('[data-card]').filter({ has: link });
    const c = (await card.boundingBox())!;
    const l = (await link.boundingBox())!;
    expect(l.x).toBeGreaterThanOrEqual(c.x - 0.5);
    expect(l.x + l.width).toBeLessThanOrEqual(c.x + c.width + 0.5);
    expect(l.height).toBeGreaterThan(30); // more than one line
    // The page does not scroll sideways.
    const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(w.s).toBeLessThanOrEqual(w.c);
  });
});
