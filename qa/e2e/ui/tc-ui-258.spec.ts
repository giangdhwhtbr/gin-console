// TC: TC-UI-258@31ca026a
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProjectPulls } from '../support/pull';

test('TC-UI-258: Board prep tasks counted apart', async ({ page, ev }) => {
  // Precondition: alpha has two blocked tracks and one blocked prep task (label prep).
  await stubProjectPulls(
    page,
    [{ name: 'alpha', path: '/tmp/alpha', beads: { open: 3, in_progress: 0, blocked: 3, ready: 0, epics: [] } }],
    [
      bead('a', { ready: true }),
      bead('t-1', { blocked: true, blocked_by: ['a'], title: 'Blocked track one' }),
      bead('t-2', { blocked: true, blocked_by: ['a'], title: 'Blocked track two' }),
      bead('p-1', { blocked: true, blocked_by: ['a'], labels: ['prep'], title: 'Blocked prep' }),
    ],
  );

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const blocked = page.getByRole('region', { name: 'Blocked' });
    await expect(blocked.getByRole('listitem')).toHaveCount(3);
    await expect(blocked.getByRole('heading', { name: /2 \+ 1 prep/ })).toBeVisible();
  });
});
