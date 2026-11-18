// TC: TC-UI-101@f56826b3
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-101: Project scope', async ({ page, ev }) => {
  // Precondition: p has top-level beads, among them epics under a milestone (parent m2) and a child task.
  const beads = [
    bead('m2', { issue_type: 'milestone' }),
    bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
    bead('e1.1', { parent: 'e1', milestone: 'm2' }),
    bead('x', { issue_type: 'epic', milestone: 'm3', blocked_by: ['e1'], blocked: true }),
    bead('y', { issue_type: 'task' }),
  ];
  await stubApi(page, {
    projects: ['p'],
    beads,
    milestoneOptions: { milestones: [milestoneOption('m2')], current: null },
  });

  await ev.step('1. Open /beads?project=p&milestone=all&view=graph', async () => {
    await page.goto('/beads?project=p&milestone=all&view=graph');
    const node = (id: string) => page.getByRole('button', { name: new RegExp(`^${id}`) });
    await expect(node('e1')).toBeVisible();
    await expect(node('x')).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Only linked' })).toBeChecked();
    await expect(node('e1.1')).toHaveCount(0);
    await expect(node('m2')).toHaveCount(0);
  });
});
