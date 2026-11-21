// TC: TC-BEADS-057@7ed072b3
import { test, expect } from '../evidence';
import { stubProjectPulls } from '../support/pull';

test('TC-BEADS-057: Older backend without pull (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: the projects have no pull key.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [{ name: 'a', path: '/tmp/a' }]);

  for (const [n, url] of [['1', '/'], ['2', '/beads?project=a'], ['3', '/my-tasks']] as const) {
    await ev.step(`${n}. Open ${url}`, async () => {
      await page.goto(url);
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      await expect(page.getByText(/pulled|no Dolt remote|pull failed|Pulling Beads/)).toHaveCount(0);
    });
  }
});
