// TC: TC-UI-113@5e82c5d7
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-113: Full card', async ({ page, ev }) => {
  // Precondition: ready P1 task t-1 assigned to alice, with 2 comments and 1 dependency.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('t-1', { title: 'Wire the thing', priority: 1, issue_type: 'task', assignee: 'alice', comment_count: 2, dependency_count: 1, ready: true })],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=board', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.locator('[data-card]').filter({ hasText: 't-1' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('t-1');
    await expect(card).toContainText('P1');
    await expect(card.getByRole('link', { name: 'Wire the thing' })).toBeVisible();
    await expect(card).toContainText('Ready');
    await expect(card).not.toContainText('task');
    await expect(card).toHaveCSS('border-left-width', '1px');
    await expect(card.getByRole('img', { name: '2 comments' })).toHaveText('2');
    await expect(card.getByRole('img', { name: '1 dependency' })).toHaveText('1');
    await expect(card).toContainText('alice');
  });
});
