// TC: TC-UI-114@b1f63573
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-114: Bare card', async ({ page, ev }) => {
  // Precondition: task t-2 with no assignee, no comments and no dependencies.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('t-2', { title: 'Bare task', issue_type: 'task', ready: true })],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=board', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.locator('[data-card]').filter({ hasText: 't-2' });
    await expect(card).toHaveCount(1);
    const last = card.locator('> div').last();
    await expect(last).toContainText('Ready');
    await expect(last).toContainText('task');
    await expect(last.getByRole('img')).toHaveCount(0);
    await expect(last).toHaveText(/^\s*Ready\s*task\s*$/i);
  });
});
