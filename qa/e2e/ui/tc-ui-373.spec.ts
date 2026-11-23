// TC: TC-UI-373@18f111e2
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-373: Bead fails to load', async ({ page, ev }) => {
  // Precondition: the Board at 1280px wide with select=t-1; the request for t-1 fails (stubbed 500).
  const beads = [bead('t-1', { title: 'Pay invoices', ready: true, priority: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.route('**/api/beads/example/t-1', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));
  await page.setViewportSize({ width: 1280, height: 900 });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&milestone=all&view=board&select=t-1');
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(panel.getByRole('alert')).toBeVisible();
    await expect(page.locator('[data-card][data-id="t-1"]')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Ready' })).toBeVisible();
  });
});
