// TC: TC-UI-315@4254c818
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-315: Board card shows data without chips', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  const epic = { ...bead('e-6', { title: 'Epic e-6', issue_type: 'epic', status: 'in_progress', priority: 2 }), points: 8, kind: 'technical' };
  await stubApi(page, { beads: [epic as never] });

  await ev.step('1. Open `/beads?project=P&view=board`', async () => {
    await page.goto('/beads?project=P&view=board');
    await expect(page.getByRole('link', { name: 'Epic e-6' })).toBeVisible();
  });

  const card = () => page.locator('[data-card][data-id="e-6"]');

  await ev.step('2. Find the card of `e-6`', async () => {
    await expect(card()).toBeVisible();
    await expect(card().locator('[data-priority="2"]')).toHaveText('P2');
    await expect(card().getByText('Technical', { exact: true })).toBeVisible();
    await expect(card().getByText('8 pt', { exact: true })).toBeVisible();
  });

  await ev.step('3. Read the computed border and background of its facts', async () => {
    const muted = 'rgb(89, 96, 114)'; // --muted-foreground of the light theme
    await expect(card().locator('[data-priority="2"]')).toHaveCSS('color', muted);
    for (const fact of [card().locator('[data-priority="2"]'), card().getByText('Technical', { exact: true }), card().getByText('8 pt', { exact: true })]) {
      for (const side of ['top', 'right', 'bottom', 'left']) await expect(fact).toHaveCSS(`border-${side}-width`, '0px');
      await expect(fact).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
    await expect(card().locator('[data-slot="badge"]')).toHaveCount(0);
  });
});
