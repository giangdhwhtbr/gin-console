// TC: TC-UI-159@ee28c2a1
import { test, expect } from '../evidence';
import { stubExample } from '../support/lanes';

test('TC-UI-159: Lanes follow the filters', async ({ page, ev }) => {
  // Precondition: assignee bao holds only lane fe of ex-e12.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12&assignee=bao', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12&assignee=bao');
    const canvas = page.getByTestId('lanes-canvas');
    await expect(canvas.getByRole('heading', { level: 3 })).toHaveText(['fe']);
    await expect(page.getByRole('region', { name: 'Lane fe' })).toBeVisible();
    await expect(page.getByRole('region', { name: /^Lane / })).toHaveCount(1);
  });
});
