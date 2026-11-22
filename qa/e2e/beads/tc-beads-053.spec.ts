// TC: TC-BEADS-053@631f42bb
import { test, expect } from '../evidence';
import { shown } from '../support/lanes';
import { pulled, stubProjectPulls } from '../support/pull';

test('TC-BEADS-053: Pulled (REQ-BEADS-018)', async ({ page, ev }) => {
  // Precondition: project A's pull is ok, 2 minutes ago.
  const pull = pulled(120);
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [{ name: 'A', path: '/tmp/a', pull }]);

  await ev.step('1. Open /', async () => {
    await page.goto('/');
    const card = page.getByRole('article', { name: 'A' });
    await expect(card.getByText('pulled 2 minutes ago')).toBeVisible();
    await expect(card.getByText('pulled 2 minutes ago')).toHaveAttribute('data-hint', shown(pull.at));
  });
});
