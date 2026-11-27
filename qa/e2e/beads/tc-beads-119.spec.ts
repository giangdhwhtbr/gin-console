// TC: TC-BEADS-119@3ed4c521
import { test, expect } from '../evidence';
import { stubProjectPulls } from '../support/pull';

test('TC-BEADS-119: Older backend shows no fetch note (REQ-BEADS-034)', async ({ page, ev }) => {
  // Precondition: the projects have no attachments_fetch key.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [{ name: 'alpha', path: '/tmp/alpha' }]);

  for (const [n, url] of [['1', '/beads?project=alpha'], ['2', '/my-tasks?project=alpha']] as const) {
    await ev.step(`${n}. Open \`${url}\``, async () => {
      await page.goto(url);
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      await expect(page.getByText(/Fetching attachments/)).toHaveCount(0);
    });
  }
});
