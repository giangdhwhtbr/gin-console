// TC: TC-UI-259@71ec2fdc
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-259: Board pinned bead', async ({ page, ev }) => {
  // Precondition: project alpha has a pinned bead that is not ready, blocked or closed.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('pin-1', { title: 'Pinned bead', status: 'pinned' })],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=board', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    await expect(page.getByRole('region', { name: 'Ready' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pinned bead/ })).toHaveCount(0);
  });

  await ev.step('2. Open /beads?project=alpha&milestone=all&view=list', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    await expect(page.getByRole('link', { name: /Pinned bead/ })).toBeVisible();
  });
});
