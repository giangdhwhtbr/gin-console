// TC: TC-UI-104@0dc8812e
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-104: Drill down and back', async ({ page, ev }) => {
  // Precondition: m2 has epic e1 (with tasks) and epic e2.
  const beads = [
    bead('m2', { issue_type: 'milestone' }),
    bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2' }),
    bead('e1.1', { parent: 'e1', milestone: 'm2' }),
    bead('e1.2', { parent: 'e1', milestone: 'm2', blocked_by: ['e1.1'], blocked: true }),
    bead('e2', { issue_type: 'epic', parent: 'm2', milestone: 'm2', blocked_by: ['e1'], blocked: true }),
  ];
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['p'],
    beads,
    milestoneOptions: { milestones: [milestoneOption('m2')], current: null },
  });
  const detail = { ...beads[1], description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null,
    dependencies: [], dependents: [], children: [], bugs: [] };
  await page.route('**/api/beads/p/e1', (route) => route.fulfill({ json: detail }));
  await page.route('**/api/beads/p/e1/comments', (route) => route.fulfill({ json: [] }));
  const node = (id: string) => page.getByRole('button', { name: new RegExp(`^${id}`) });
  const panel = page.getByRole('complementary', { name: 'Bead details' });
  const trail = page.getByRole('navigation', { name: 'Graph scope' });

  await ev.step('1. Open /beads?project=p&milestone=m2&view=graph', async () => {
    await page.goto('/beads?project=p&milestone=m2&view=graph');
    await expect(node('e1')).toBeVisible();
    await expect(node('e2')).toBeVisible();
  });

  await ev.step('2. Click the node of epic `e1`', async () => {
    await node('e1').click();
    await expect(page).toHaveURL(/[?&]select=e1(&|$)/);
    await expect(panel.getByRole('heading', { name: 'Title e1' })).toBeVisible();
  });

  await ev.step('3. Choose "Show children" in the details panel', async () => {
    await panel.getByRole('button', { name: 'Show children' }).click();
    await expect(page).toHaveURL(/[?&]scope=e1(&|$)/);
    await expect(page).not.toHaveURL(/[?&]select=/);
    await expect(node('e1.1')).toBeVisible();
    await expect(node('e1.2')).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expect(trail.getByRole('button')).toHaveText(['m2', 'e1']);
  });

  await ev.step('4. Choose `m2` in the breadcrumb', async () => {
    await trail.getByRole('button', { name: 'm2', exact: true }).click();
    await expect(page).not.toHaveURL(/scope=e1/);
    await expect(node('e1')).toBeVisible();
    await expect(node('e2')).toBeVisible();
    await expect(node('e1.1')).toHaveCount(0);
  });
});
