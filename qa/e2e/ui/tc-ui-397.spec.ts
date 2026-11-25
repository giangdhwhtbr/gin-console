// TC: TC-UI-397@f7cb551c
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-397: Blocked card names its first blocker (REQ-UI-065)', async ({ page, ev }) => {
  // Precondition: blocked task t-3 has open blockers t-1 "Set up CI" and t-2, both loaded.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('t-1', { title: 'Set up CI', ready: true }),
      bead('t-2', { title: 'Design tokens', ready: true }),
      bead('t-3', { title: 'Build checkout', blocked: true, blocked_by: ['t-1', 't-2'], dependency_count: 2 }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=board', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.locator('[data-card]').filter({ hasText: 't-3' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Blocked by Set up CI');
    await expect(card).toContainText('+1');
  });
});
