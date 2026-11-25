// TC: TC-UI-389@8ce9266b
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';

test('TC-UI-389: Blocked status without a blocker (REQ-UI-152)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; t-1 has the status blocked and no dependency.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const t1 = bead('t-1', { title: 'Stuck task', status: 'blocked', blocked: true });
  await stubApi(page, { beads: [t1] });
  await stubBeadDetails(page, 'P', [beadDetail(t1)]);

  await ev.step('1. Open `/beads/P/t-1`', async () => {
    await page.goto('/beads/P/t-1');
    await expect(page.getByRole('heading', { name: 'Stuck task', level: 1 })).toBeVisible();
    await expect(page.getByText('Blocked', { exact: true })).toBeVisible();
    await expect(page.getByText(/Blocked by/)).toHaveCount(0);
  });
});
