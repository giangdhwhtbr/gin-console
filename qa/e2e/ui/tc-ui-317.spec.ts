// TC: TC-UI-317@92144880
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-317: Controls keep their pills', async ({ page, ev }) => {
  // Precondition: project P reports open and closed beads, a P1 bead among them; the window is 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    beads: [
      bead('a-1', { title: 'Open bead', priority: 1 }),
      bead('a-2', { title: 'Closed bead', status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
    ],
  });
  const WASH = 'rgb(244, 240, 252)';

  await ev.step('1. Open `/beads?project=P&view=list&status=open&priority=1&milestone=all`', async () => {
    await page.goto('/beads?project=P&view=list&status=open&priority=1&milestone=all');
    await expect(page.getByRole('link', { name: 'Open bead' })).toBeVisible();
  });

  await ev.step('2. Find the Status filter chip', async () => {
    const status = page.getByRole('button', { name: 'Status open', exact: true });
    await expect(status).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Status filter' })).toBeVisible();
    // the chip is the identity wash with an identity border; the "×" sits in it
    const chip = status.locator('xpath=..');
    await expect(chip).toHaveCSS('background-color', WASH);
  });

  await ev.step('3. Find the button "More filters"', async () => {
    const more = page.getByRole('button', { name: /^More filters/ });
    await expect(more).toBeVisible();
    const pill = more.getByText('1', { exact: true });
    await expect(pill).toBeVisible();
    await expect(pill).toHaveCSS('background-color', WASH);
  });
});
