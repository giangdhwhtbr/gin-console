// TC: TC-BEADS-055@20bb5702
import { test, expect } from '../evidence';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-055: Failed pull on the card (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: project A's pull failed 1 minute ago and A has beads counts.
  const beads = { open: 3, in_progress: 1, blocked: 0, ready: 2, epics: [] };
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [
    { name: 'A', path: '/tmp/a', beads, pull: pulled(60, { status: 'error', error: 'Merge conflict detected' }) },
  ]);

  await ev.step('1. Open /', async () => {
    await page.goto('/');
    const card = page.getByRole('article', { name: 'A' });
    await expect(card.getByText('pull failed: Merge conflict detected')).toBeVisible();
    // PullLine marks a failure with the destructive text colour; no role or attribute carries it.
    await expect(card.getByText('pull failed: Merge conflict detected')).toHaveClass(/text-destructive/);
    await expect(card).toContainText('open 3');
    await expect(card).toContainText('ready 2');
  });
});
