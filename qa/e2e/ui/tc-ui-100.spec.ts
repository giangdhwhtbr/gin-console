// TC: TC-UI-100@2d054e59
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-100: Milestone scope', async ({ page, ev }) => {
  // Precondition: m2 has epics e1 and e2; e2 is blocked by x, an epic under milestone m3.
  const beads = [
    bead('m2', { issue_type: 'milestone' }),
    bead('m3', { issue_type: 'milestone' }),
    bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
    bead('e2', { issue_type: 'epic', parent: 'm2', milestone: 'm2', blocked_by: ['x'], blocked: true }),
    bead('x', { issue_type: 'epic', milestone: 'm3' }),
  ];
  await stubApi(page, {
    projects: ['p'],
    beads,
    milestoneOptions: { milestones: [milestoneOption('m2'), milestoneOption('m3')], current: null },
  });

  await ev.step('1. Open /beads?project=p&milestone=m2&view=graph', async () => {
    await page.goto('/beads?project=p&milestone=m2&view=graph');
    const node = (id: string) => page.getByRole('button', { name: new RegExp(`^${id}`) });
    await expect(node('e1')).toBeVisible();
    await expect(node('e2')).toBeVisible();
    await expect(node('x')).toBeVisible();
    await expect(node('x')).toHaveAttribute('data-external', 'true');
    await expect(page.getByText('Dashed nodes are outside this milestone.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Dependencies' }).getByRole('listitem')).toHaveText('e2 is blocked by x');
  });
});
