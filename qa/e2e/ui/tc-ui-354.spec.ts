// TC: TC-UI-354@64cd048a
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-354: More filters count (REQ-UI-145)', async ({ page, ev }) => {
  // Precondition: 1440px wide; priority, label (with label_mode) and kind are in the popover, status is on the bar.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads: [bead('ex-1', { priority: 1, labels: ['ui'] })] });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&priority=1&label=ui&label_mode=all&kind=technical&status=open');
    const more = page.getByRole('button', { name: /^More filters/ });
    await expect(more).toBeVisible();
    await expect(more).toHaveAccessibleName('More filters 3');
    await expect(more.getByText('3', { exact: true })).toBeVisible();
  });
});
