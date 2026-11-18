// TC: TC-UI-084@9e5306e6
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-084: Old Tree link', async ({ page, ev }) => {
  await stubApi(page, { projects: ['a'], beads: [bead('a-1', { title: 'fix login' }), bead('a-2', { title: 'other work' })] });
  const views = page.getByRole('navigation', { name: 'View' });

  await ev.step('1. Open /beads?project=a&view=tree', async () => {
    await page.goto('/beads?project=a&view=tree');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    await expect(views.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('tree', { name: 'Beads of a' })).toBeVisible();
    await expect(views.getByRole('button', { name: 'Tree' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Tree' })).toHaveCount(0);
  });
});
