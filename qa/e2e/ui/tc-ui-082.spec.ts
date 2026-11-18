// TC: TC-UI-082@92435825
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-082: Restored from the URL', async ({ page, ev }) => {
  await stubApi(page, { projects: ['a'], beads: [bead('a-1', { title: 'fix login' }), bead('a-2', { title: 'other work' })] });
  const views = page.getByRole('navigation', { name: 'View' });

  await ev.step('1. Open /beads?project=a&view=focus', async () => {
    await page.goto('/beads?project=a&view=focus');
    await expect(page.getByRole('heading', { name: 'Beads', level: 1 })).toBeVisible();
    await expect(views.getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'In flight' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveValue('a');
  });
});
