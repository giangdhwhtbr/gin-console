// TC: TC-UI-355@f7db6cc7
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-355: More filters without count (REQ-UI-145)', async ({ page, ev }) => {
  // Precondition: 1440px wide; only label_mode=all in the URL, no other filter of the popover.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1', { labels: ['ui'] })] });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&label_mode=all');
    const more = page.getByRole('button', { name: /^More filters/ });
    await expect(more).toBeVisible();
    await expect(more).toHaveAccessibleName('More filters');
    await expect(more).toHaveText('More filters');
  });
});
