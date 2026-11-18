// TC: TC-UI-105@cd65b371
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-105: Open a leaf', async ({ page, ev }) => {
  // Precondition: epic e1 with task e1.1 that has no children; the tasks of e1 are drawn.
  const beads = [
    bead('m2', { issue_type: 'milestone' }),
    bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
    bead('e1.1', { parent: 'e1', milestone: 'm2' }),
  ];
  await stubApi(page, {
    projects: ['p'],
    beads,
    milestoneOptions: { milestones: [milestoneOption('m2')], current: null },
  });
  const leaf = { ...beads[2], description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null,
    dependencies: [], dependents: [], children: [], bugs: [] };
  await page.route('**/api/beads/p/e1.1', (route) => route.fulfill({ json: leaf }));
  await page.route('**/api/beads/p/e1.1/comments', (route) => route.fulfill({ json: [] }));
  const node = (id: string) => page.getByRole('button', { name: new RegExp(`^${id}`) });

  await ev.step('1. Open /beads?project=p&milestone=m2&view=graph&scope=e1', async () => {
    await page.goto('/beads?project=p&milestone=m2&view=graph&scope=e1');
    await expect(node('e1.1')).toBeVisible();
  });

  await ev.step('2. Open task e1.1', async () => {
    await node('e1.1').dblclick();
    await expect(page).toHaveURL(/\/beads\/p\/e1\.1/);
    await expect(page.getByRole('heading', { name: /Title e1\.1/ })).toBeVisible();
  });
});
