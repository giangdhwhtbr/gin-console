// TC: TC-UI-200@f818c25a
import { test, expect } from '../evidence';
import { E12, PROJECT, factOf } from '../support/lanes';
import { openEpicStubs, workflow } from '../support/epic';

test('TC-UI-200: Workflow stage (REQ-UI-120)', async ({ page, ev }) => {
  // Precondition: the workflow request for ex-e12 answers stage execute, 4 of 6 gates satisfied, no warnings and no waivers.
  await openEpicStubs(page, undefined, { workflow: workflow() });
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const card = page.getByRole('region', { name: 'Workflow' });
    const stages = card.getByRole('list', { name: 'Stages' }).getByRole('listitem');
    await expect(stages).toHaveText(['discuss', 'plan', 'orchestrate', 'execute', 'ship']);
    // the stages before the current one carry a tick, the current one is marked, the next one is plain
    for (const done of ['discuss', 'plan', 'orchestrate']) {
      const item = stages.filter({ hasText: done });
      await expect(item.locator('svg')).toHaveCount(1);
      await expect(item).not.toHaveAttribute('aria-current', 'step');
    }
    await expect(stages.filter({ hasText: 'execute' })).toHaveAttribute('aria-current', 'step');
    await expect(stages.filter({ hasText: 'execute' }).locator('svg')).toHaveCount(0);
    await expect(stages.filter({ hasText: 'ship' }).locator('svg')).toHaveCount(0);
    await expect(stages.filter({ hasText: 'ship' })).not.toHaveAttribute('aria-current', 'step');
    await expect(factOf(card, 'Gates')).toHaveText('4 of 6 satisfied');
    await expect(factOf(card, 'Warnings')).toHaveText('none');
    await expect(factOf(card, 'Waivers')).toHaveText('none');
  });
});
