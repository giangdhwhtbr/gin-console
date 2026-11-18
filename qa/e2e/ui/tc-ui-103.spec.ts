// TC: TC-UI-103@702ed07c
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-103: Shared with the other views', async ({ page, ev }) => {
  // Precondition: some titles contain "pay".
  const beads = [
    bead('b1', { title: 'Pay invoices' }),
    bead('b2', { title: 'Payment retries', blocked_by: ['b1'], blocked: true }),
    bead('b3', { title: 'Unrelated work' }),
  ];
  const stub = await stubApi(page, { projects: ['p'], beads });
  const beadCalls = () => stub.calls.filter((u) => u.pathname === '/api/beads').length;
  let before = 0;

  await ev.step('1. Open /beads?project=p&q=pay', async () => {
    await page.goto('/beads?project=p&q=pay');
    await expect(page.getByRole('link', { name: /Pay invoices/ }).first()).toBeVisible();
    await expect(page.getByText('Unrelated work')).toHaveCount(0);
    before = beadCalls();
    expect(before).toBeGreaterThan(0);
  });

  await ev.step('2. Choose Graph in the views', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Graph' }).click();
    await expect(page).toHaveURL(/view=graph/);
    await expect(page).toHaveURL(/q=pay/);
    const node = (id: string) => page.getByRole('button', { name: new RegExp(`^${id}`) });
    await expect(node('b1')).toBeVisible();
    await expect(node('b2')).toBeVisible();
    await expect(node('b3')).toHaveCount(0);
    expect(beadCalls()).toBe(before);
  });
});
