// TC: TC-BEADS-070@09e74aed
import { test, expect } from '../evidence';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-070: Pulled just now (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: project A's pull is ok, 10 seconds ago.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [{ name: 'A', path: '/tmp/a', pull: pulled(10) }]);

  await ev.step('1. Open /', async () => {
    await page.goto('/');
    await expect(page.getByRole('article', { name: 'A' }).getByText('pulled just now')).toBeVisible();
  });
});
