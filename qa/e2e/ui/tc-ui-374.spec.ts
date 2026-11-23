// TC: TC-UI-374@44063540
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';
import { stubEpicPage } from '../support/epic';

// m2 has epic e1 with tasks e1.1 (ready) and e1.2 (blocked by e1.1).
const beads = [
  bead('m2', { issue_type: 'milestone' }),
  bead('e1', { title: 'Epic one', issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
  bead('e1.1', { title: 'Task one', parent: 'e1', milestone: 'm2', ready: true }),
  bead('e1.2', { title: 'Task two', parent: 'e1', milestone: 'm2', blocked: true, blocked_by: ['e1.1'], dependency_count: 1 }),
];
const milestoneOptions = { milestones: [{ id: 'm2', title: 'Title m2', status: 'active' as const, start: '2026-11-02', end: '2026-12-18' }], current: null };

test('TC-UI-374: Show children in the Graph', async ({ page, ev }) => {
  // Precondition: the Graph view of milestone m2 at 1440px wide with select=e1; e1 is an epic with tasks.
  await stubApi(page, { projects: ['p'], beads, milestoneOptions });
  await stubDetails(page, beads, 'p');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/beads?project=p&milestone=m2&view=graph&select=e1');
  const panel = page.getByRole('complementary', { name: 'Bead details' });
  await expect(panel.getByRole('heading', { name: 'Epic one' })).toBeVisible();

  await ev.step('1. Click "Show children" in the panel', async () => {
    await panel.getByRole('button', { name: 'Show children' }).click();
    await expect(page).toHaveURL(/[?&]scope=e1(&|$)/);
    await expect(page).not.toHaveURL(/select=/);
    await expect(page.locator('[data-node="e1.1"]')).toBeVisible();
    await expect(page.locator('[data-node="e1.2"]')).toBeVisible();
    await expect(panel).toHaveCount(0);
    const trail = page.getByRole('navigation', { name: 'Graph scope' });
    await expect(trail).toHaveText(/m2\s*›\s*e1/);
    await expect(trail.getByRole('button', { name: 'e1' })).toHaveAttribute('aria-current', 'location');
  });
});
