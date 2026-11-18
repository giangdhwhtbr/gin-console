// TC: TC-UI-102@753ae82c
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-102: Filters apply to the nodes', async ({ page, ev }) => {
  // Precondition: e1 has a task assigned to bao; e2 has no bead assigned to bao. e1 and e2 are linked so both would be drawn unfiltered.
  const beads = [
    bead('e0', { issue_type: 'epic' }),
    bead('e0.1', { parent: 'e0', assignee: 'bao' }),
    bead('e1', { issue_type: 'epic', blocked_by: ['e0'], blocked: true }),
    bead('e1.1', { parent: 'e1', assignee: 'bao' }),
    bead('e2', { issue_type: 'epic', blocked_by: ['e3'], blocked: true }),
    bead('e2.1', { parent: 'e2', assignee: 'cuong' }),
    bead('e3', { issue_type: 'epic' }),
  ];
  await stubApi(page, { projects: ['p'], beads });

  await ev.step('1. Open /beads?project=p&milestone=all&view=graph&assignee=bao', async () => {
    await page.goto('/beads?project=p&milestone=all&view=graph&assignee=bao');
    const node = (id: string) => page.getByRole('button', { name: new RegExp(`^${id}`) });
    await expect(node('e1')).toBeVisible();
    await expect(node('e2')).toHaveCount(0);
  });
});
