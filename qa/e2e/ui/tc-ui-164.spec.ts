// TC: TC-UI-164@4a7e685f
import { test, expect } from '../evidence';
import { factOf, stubExample } from '../support/lanes';

test('TC-UI-164: Lane with all tracks closed', async ({ page, ev }) => {
  // Precondition: lane fe has one track, closed.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    const fe = page.getByRole('region', { name: 'Lane fe' });
    await expect(fe).toBeVisible();
    await expect(factOf(fe, 'State')).toHaveText('All tracks closed');
    await expect(factOf(fe, 'Tracks')).toHaveText('1/1 closed');
    await expect(fe.getByText('Held by', { exact: true })).toHaveCount(0);
    await expect(fe.getByText('Lease', { exact: true })).toHaveCount(0);
  });
});
