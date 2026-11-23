// TC: TC-UI-041@38576a2a
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-041: Closed milestone (REQ-UI-104)', async ({ page, ev }) => {
  // Precondition: alpha has closed milestone m1 (all beads closed), active m2, and Show closed is off.
  await page.setViewportSize({ width: 1440, height: 900 });
  const stub = await stubApi(page, {
    projects: ['alpha'],
    milestoneOptions: {
      milestones: [
        milestoneOption('m1', { title: 'Alpha launch', status: 'closed', start: '2026-08-03', end: '2026-09-18' }),
        milestoneOption('m2', { title: 'Checkout v2', status: 'active' }),
      ],
      current: 'm2',
    },
    beads: [
      bead('a-1', { title: 'Open under m2', milestone: 'm2' }),
      bead('a-2', { title: 'Closed under m1 one', milestone: 'm1', status: 'closed', closed_at: '2026-09-10T00:00:00Z' }),
      bead('a-3', { title: 'Closed under m1 two', milestone: 'm1', status: 'closed', closed_at: '2026-09-11T00:00:00Z' }),
    ],
  });

  await ev.step('1. Open `/beads?project=alpha`', async () => {
    await page.goto('/beads?project=alpha');
    await expect(page.getByRole('link', { name: 'Open under m2' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Show closed' })).not.toBeChecked();
  });

  await ev.step('2. Open the Milestone chip and choose `radio "<title of m1>"` in `radiogroup "Milestone"`', async () => {
    const before = stub.calls.length;
    await page.getByRole('button', { name: 'Milestone Checkout v2' }).click();
    await page.getByRole('radiogroup', { name: 'Milestone' }).getByRole('radio', { name: 'Alpha launch' }).check();
    await expect(page.getByRole('link', { name: 'Closed under m1 one' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Closed under m1 two' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open under m2' })).toHaveCount(0);
    const asked = stub.calls.slice(before).filter((u) => u.pathname === '/api/beads');
    expect(asked.some((u) => u.searchParams.get('closed') === '1')).toBe(true);
  });
});
