// TC: TC-UI-149@1dededb9
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-149: Card with points (REQ-UI-065)', async ({ page, ev }) => {
  // Precondition: project alpha has an in-progress epic e-3 with 8 points.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [{ ...bead('e-3', { title: 'Big epic', issue_type: 'epic', status: 'in_progress' }), points: 8 } as ReturnType<typeof bead>],
  });

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.locator('[data-card]').filter({ hasText: 'e-3' });
    await expect(card).toHaveCount(1);
    const last = card.locator('> div').last();
    await expect(last).toContainText('In progress');
    await expect(last).toContainText('8 pt');
    await expect(last).toContainText('Unassigned');
  });
});
