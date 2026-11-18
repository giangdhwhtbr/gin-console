// TC: TC-UI-118@c663339f
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const TITLE = 'Handle PaymentReconciliationServiceTimeoutExceptionHandlerFactoryProviderBean in the worker';

test('TC-UI-118: Unbroken title on a phone', async ({ page, ev }) => {
  // Precondition: alpha has t-1 with an unbroken long word in its title; the window is 390px wide.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1', { title: TITLE })] });
  await page.route('**/api/beads/alpha/t-1', (route) =>
    route.fulfill({
      json: {
        ...bead('t-1', { title: TITLE }),
        description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null,
        dependencies: [], dependents: [], bugs: [], children: [],
      },
    }),
  );
  await page.route('**/api/beads/alpha/t-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open /beads/alpha/t-1', async () => {
    await page.goto('/beads/alpha/t-1');
    const heading = page.getByRole('heading', { level: 1, name: TITLE });
    await expect(heading).toBeVisible();
    // The heading wraps inside the window.
    const h = (await heading.boundingBox())!;
    expect(h.x).toBeGreaterThanOrEqual(0);
    expect(h.x + h.width).toBeLessThanOrEqual(390);
    expect(h.height).toBeGreaterThan(30);
    // The page does not scroll sideways.
    const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(w.s).toBeLessThanOrEqual(w.c);
  });
});
