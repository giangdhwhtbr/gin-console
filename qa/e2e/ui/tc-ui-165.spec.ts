// TC: TC-UI-165@b830b6a0
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { epic, factOf, stubExample, track } from '../support/lanes';

test('TC-UI-165: Lane not started and lane blocked', async ({ page, ev }) => {
  // Precondition: lane x has two open unassigned tracks without blockers; lane y has a first open track blocked by an open bead that is not a merge gate.
  await stubExample(page, [
    epic(),
    track(1, 'x', { ready: true }),
    track(2, 'x', { ready: true }),
    track(3, 'y', { blocked: true, blocked_by: ['ex-b1'], dependency_count: 1 }),
    bead('ex-b1', { title: 'Provision the sandbox' }),
  ]);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e12');
    await expect(factOf(page.getByRole('region', { name: 'Lane x' }), 'State')).toHaveText('Not started');
    await expect(factOf(page.getByRole('region', { name: 'Lane y' }), 'State')).toHaveText('Blocked');
  });
});
