// TC: TC-UI-081@53d1d273
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-081: Switch keeps filters', async ({ page, ev }) => {
  const stub = await stubApi(page, { projects: ['a'], beads: [bead('a-1', { title: 'fix login', ready: true }), bead('a-2', { title: 'other work' })] });
  const views = page.getByRole('navigation', { name: 'View' });

  await ev.step('1. Open /beads?project=a&status=open&q=fix', async () => {
    await page.goto('/beads?project=a&status=open&q=fix');
    await expect(views.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('fix');
    await expect(page.getByRole('tree', { name: 'Beads of a' })).toBeVisible();
  });

  await ev.step('2. Choose Board in the views', async () => {
    const before = stub.calls.filter((u) => u.pathname === '/api/beads').length;
    await views.getByRole('button', { name: 'Board' }).click();
    await expect(page).toHaveURL(/[?&]view=board(&|$)/);
    await expect(views.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: /^Backlog/ })).toBeVisible();
    await expect(page).toHaveURL(/[?&]status=open(&|$)/);
    await expect(page).toHaveURL(/[?&]q=fix(&|$)/);
    await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('fix');
    await expect(page.getByRole('button', { name: 'Status 1' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'fix login' })).toBeVisible();
    expect(stub.calls.filter((u) => u.pathname === '/api/beads').length).toBe(before);
  });
});
