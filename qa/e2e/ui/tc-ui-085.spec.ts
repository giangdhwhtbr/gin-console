// TC: TC-UI-085@469fca51
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-085: Old Graph link', async ({ page, ev }) => {
  // Precondition: epic e-1 with tasks, and other open beads (o-2 is blocked by o-1) outside it.
  await stubApi(page, {
    projects: ['a'],
    beads: [
      bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
      bead('e-1.1', { title: 'Task one', parent: 'e-1' }),
      bead('e-1.2', { title: 'Task two', parent: 'e-1' }),
      bead('o-1', { title: 'Other one' }),
      bead('o-2', { title: 'Other two', blocked: true, blocked_by: ['o-1'], dependency_count: 1 }),
    ],
  });
  const views = page.getByRole('navigation', { name: 'View' });

  await ev.step('1. Open /beads?project=a&view=graph&epic=e-1', async () => {
    await page.goto('/beads?project=a&view=graph&epic=e-1');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    await expect(views.getByRole('button', { name: 'Graph' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('navigation', { name: 'Graph scope' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Graph scope' }).getByRole('button')).toHaveText(['a']);
    await expect(page.getByRole('list', { name: 'Dependencies' })).toContainText('o-2 is blocked by o-1');
  });
});
