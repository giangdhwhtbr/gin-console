// TC: TC-UI-083@4c9eb64d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-083: Unknown view', async ({ page, ev }) => {
  await stubApi(page, { projects: ['a'], beads: [bead('a-1', { title: 'fix login' }), bead('a-2', { title: 'other work' })] });
  const views = page.getByRole('navigation', { name: 'View' });

  await ev.step('1. Open /beads?project=a&view=kanban', async () => {
    await page.goto('/beads?project=a&view=kanban');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    await expect(views.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('tree', { name: 'Beads of a' })).toBeVisible();
  });
});
