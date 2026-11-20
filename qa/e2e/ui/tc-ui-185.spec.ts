// TC: TC-UI-185@44709406
import { test, expect } from '../evidence';
import { openGraph, shown, showClosed, stubExample, TOMORROW_16 } from '../support/lanes';

test('TC-UI-185: Lane box header', async ({ page, ev }) => {
  // Precondition: lane be has track 1 closed and track 2 in progress, held by ann with a lease that expires tomorrow at 16:00.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
  });

  await ev.step('2. Turn "Show closed" on', async () => {
    await showClosed(page);
    const header = page.getByRole('region', { name: 'Lane be' }).locator('header');
    await expect(header.locator('[data-swatch]')).toBeVisible();
    const first = header.locator('> div');
    await expect(first.getByRole('heading', { name: 'be' })).toBeVisible();
    await expect(first).toContainText('Running');
    await expect(header.locator('> p')).toHaveText(`ann · lease until ${shown(TOMORROW_16)} · 1/2 closed`);
  });
});
