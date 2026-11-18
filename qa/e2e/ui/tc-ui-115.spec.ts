// TC: TC-UI-115@d2bf6b91
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-115: Long id', async ({ page, ev }) => {
  const id = 'ex-payments-provider-migration-and-reconciliation-2026.2.1';
  await stubApi(page, { projects: ['alpha'], beads: [bead(id, { title: 'Payments migration' })] });

  await ev.step('1. Open /beads?project=alpha&milestone=all', async () => {
    await page.goto('/beads?project=alpha&milestone=all');
    const short = page.getByText('ex-payments-pr…-2026.2.1', { exact: true });
    await expect(short.first()).toBeVisible();
    await expect(short.first()).toHaveAttribute('title', id);
    // the id reads in full, not clipped by the row
    const clipped = await short.first().evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(clipped).toBe(false);
  });
});
