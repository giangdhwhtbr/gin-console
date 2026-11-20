// TC: TC-UI-156@d3ffa3ac
import { test, expect } from '../evidence';
import { stubExample } from '../support/lanes';

test('TC-UI-156: Lanes offered for an epic with lanes', async ({ page, ev }) => {
  // Precondition: the example project has epic ex-e12, whose tracks have lanes, and epic ex-e3, whose tracks have none.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const views = page.getByRole('navigation', { name: 'View' });

  await ev.step('1. Open /beads?project=example&view=graph&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=graph&scope=ex-e12');
    await expect(views.getByRole('button', { name: 'Graph' })).toBeVisible();
    await expect(views.getByRole('button', { name: 'Lanes' })).toBeVisible();
  });

  await ev.step('2. Open /beads?project=example&view=graph&scope=ex-e3', async () => {
    await page.goto('/beads?project=example&view=graph&scope=ex-e3');
    await expect(views.getByRole('button', { name: 'Graph' })).toBeVisible();
    await expect(views.getByRole('button', { name: 'Lanes' })).toHaveCount(0);
  });

  await ev.step('3. Open /beads?project=example&view=graph', async () => {
    await page.goto('/beads?project=example&view=graph');
    await expect(views.getByRole('button', { name: 'Graph' })).toBeVisible();
    await expect(views.getByRole('button', { name: 'Lanes' })).toHaveCount(0);
  });
});
