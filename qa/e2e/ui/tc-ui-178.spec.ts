// TC: TC-UI-178@6489f6e7
import { test, expect } from '../evidence';
import { e12, E12, plain, stubExample } from '../support/lanes';

test('TC-UI-178: Lanes tab', async ({ page, ev }) => {
  // Precondition: "Show closed" is off; a bead of ex-e12 has "Payment" in its title; ex-e12 is an epic whose tracks have lanes.
  const beads = [...e12().map((b) => (b.id === `${E12}.2` ? { ...b, title: 'Payment gateway' } : b)), ...plain()];
  const stub = await stubExample(page, beads);
  await page.setViewportSize({ width: 1440, height: 900 });
  const closedLoads = () => stub.calls.filter((u) => u.pathname === '/api/beads' && u.searchParams.get('closed') === '1').length;

  await ev.step('1. Open /beads?project=example&view=graph&scope=ex-e12&q=Payment', async () => {
    await page.goto('/beads?project=example&view=graph&scope=ex-e12&q=Payment');
    await expect(page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Lanes' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('Payment');
    expect(closedLoads()).toBe(0);
  });

  await ev.step('2. Choose Lanes in the views', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Lanes' }).click();
    await expect(page).toHaveURL(/view=lanes/);
    await expect(page).toHaveURL(/q=Payment/);
    await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('Payment');
    await expect(page.getByTestId('lanes-canvas')).toBeVisible();
    await expect.poll(closedLoads).toBeGreaterThan(0);
  });
});
