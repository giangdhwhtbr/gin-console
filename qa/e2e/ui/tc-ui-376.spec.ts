// TC: TC-UI-376@b925db9d
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

test('TC-UI-376: No Show children in the List', async ({ page, ev }) => {
  // Precondition: the List view at 1280px wide with select=e1.
  await stubApi(page, { projects: ['p'], beads, milestoneOptions });
  await stubDetails(page, beads, 'p');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=p&milestone=m2&view=list&select=e1');

  await ev.step('1. Read the panel', async () => {
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Epic one' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Open page' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Show children' })).toHaveCount(0);
  });
});
