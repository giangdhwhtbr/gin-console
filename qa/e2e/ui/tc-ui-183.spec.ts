// TC: TC-UI-183@ec36f68d
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubExample } from '../support/lanes';

test('TC-UI-183: Scope without lanes has no boxes', async ({ page, ev }) => {
  // Precondition: epic ex-e3 has tracks without a lane; track 2 is blocked by track 1, so the layers show.
  await stubExample(page, [
    bead('ex-e3', { title: 'Billing exports for finance', issue_type: 'epic' }),
    bead('ex-e3.1', { title: 'Export CSV', parent: 'ex-e3', ready: true }),
    bead('ex-e3.2', { title: 'Send the export', parent: 'ex-e3', blocked: true, blocked_by: ['ex-e3.1'], dependency_count: 1 }),
  ]);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e3', async () => {
    await page.goto('/beads?project=example&milestone=all&view=graph&scope=ex-e3');
    const one = page.locator('[data-node="ex-e3.1"]');
    const two = page.locator('[data-node="ex-e3.2"]');
    await expect(one).toBeVisible();
    await expect(two).toBeVisible();
    // layers: the blocked track is in another layer than its blocker
    const [a, b] = [await one.boundingBox(), await two.boundingBox()];
    expect(Math.abs(b!.x - a!.x) + Math.abs(b!.y - a!.y)).toBeGreaterThan(a!.width / 2);
    // no lane box and no chip
    await expect(page.locator('section[data-lane]')).toHaveCount(0);
    await expect(page.locator('[data-chip]')).toHaveCount(0);
    await expect(page.getByRole('switch', { name: 'Only linked' })).toBeVisible();
  });
});
