// TC: TC-UI-106@ede8dd88
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-106: Details panel', async ({ page, ev }) => {
  // Precondition: project p with epic e1.
  await stubApi(page, { projects: ['p'], beads: [bead('e1', { issue_type: 'epic' }), bead('e2', { issue_type: 'epic', blocked: true, blocked_by: ['e1'] })] });
  const detail = { ...bead('e1', { issue_type: 'epic' }), description: null, design: null, notes: null, acceptance_criteria: null,
    close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] };
  await page.route('**/api/beads/p/e1', (route) => route.fulfill({ json: detail }));
  await page.route('**/api/beads/p/e1/comments', (route) => route.fulfill({ json: [] }));
  const node = (id: string) => page.getByRole('button', { name: new RegExp(`^${id}`) });

  await ev.step('1. Open /beads?project=p&milestone=all&view=graph', async () => {
    await page.goto('/beads?project=p&milestone=all&view=graph');
    await expect(node('e1')).toBeVisible();
  });

  await ev.step('2. Look at the page without selecting a node', async () => {
    await expect(page).not.toHaveURL(/[?&]select=/);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
  });

  await ev.step('3. Select e1', async () => {
    await node('e1').click();
    await expect(page).toHaveURL(/[?&]select=e1(&|$)/);
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('link', { name: 'Open page' })).toHaveAttribute('href', '/beads/p/e1');
    await expect(panel.getByText('Title e1')).toBeVisible();
  });
});
