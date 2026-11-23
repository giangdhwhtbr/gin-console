// TC: TC-UI-347@66ec978f
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi, type BeadSummary } from '../support/api';

test('TC-UI-347: Filter button without a value (REQ-UI-144)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example at 1440px wide without status in the URL.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1'), bead('ex-2', { status: 'in_progress' })] });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('button', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Status filter' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Status.*×/ })).toHaveCount(0);
  });
});
