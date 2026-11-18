// TC: TC-UI-107@babd2da7
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-107: Nothing matches', async ({ page, ev }) => {
  // Precondition: project p with beads, none matching "zzz".
  await stubApi(page, { projects: ['p'], beads: [bead('e1', { issue_type: 'epic' }), bead('t1')] });

  await ev.step('1. Open /beads?project=p&milestone=all&view=graph&q=zzz', async () => {
    await page.goto('/beads?project=p&milestone=all&view=graph&q=zzz');
    await expect(page.getByText('No beads match these filters')).toBeVisible();
  });
});
