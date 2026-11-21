// TC: TC-BEADS-054@6ee80cd3
import { test, expect } from '../evidence';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-054: No remote on the card (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: project B's pull status is no_remote.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [{ name: 'B', path: '/tmp/b', pull: pulled(60, { status: 'no_remote' }) }]);

  await ev.step('1. Open /', async () => {
    await page.goto('/');
    const card = page.getByRole('article', { name: 'B' });
    await expect(card.getByText('no Dolt remote')).toBeVisible();
    await expect(card.getByText(/pull failed/)).toHaveCount(0);
  });
});
