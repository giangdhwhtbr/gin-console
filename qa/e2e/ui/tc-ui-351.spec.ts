// TC: TC-UI-351@c8cc6603
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi, type BeadSummary } from '../support/api';


const options = {
  milestones: [
    milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' }),
    milestoneOption('ex-m3', { title: 'Payments', status: 'planned' }),
    milestoneOption('ex-m1', { title: 'Launch', status: 'closed' }),
  ],
  current: 'ex-m2',
};
const beads: BeadSummary[] = [
  bead('ex-1', { title: 'In checkout', milestone: 'ex-m2' }),
  bead('ex-2', { title: 'In payments', milestone: 'ex-m3' }),
  bead('ex-3', { title: 'Loose bead', milestone: null }),
];

test('TC-UI-351: Milestone menu (REQ-UI-144)', async ({ page, ev }) => {
  // Precondition: current milestone ex-m2 "Checkout v2"; ex-m3 is "Payments"; 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads, milestoneOptions: options });

  await ev.step('1. Open `/beads?project=example`', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('button', { name: 'Milestone Checkout v2', exact: true })).toBeVisible();
  });

  await ev.step('2. Click the body of the chip "Milestone Checkout v2 ×"', async () => {
    await page.getByRole('button', { name: 'Milestone Checkout v2', exact: true }).click();
    const group = page.getByRole('radiogroup', { name: 'Milestone' });
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio')).toHaveCount(5);
    await expect(group.getByRole('radio').nth(0)).toHaveAccessibleName('All');
    await expect(group.getByRole('radio').nth(1)).toHaveAccessibleName('No milestone');
    // the groups, in order: Active, Planned, Closed
    await expect(group.getByRole('group')).toHaveCount(3);
    await expect(group.getByRole('group').nth(0)).toHaveAccessibleName('Active');
    await expect(group.getByRole('group').nth(1)).toHaveAccessibleName('Planned');
    await expect(group.getByRole('group').nth(2)).toHaveAccessibleName('Closed');
    await expect(group.getByRole('group', { name: 'Active' }).getByRole('radio', { name: 'Checkout v2' })).toBeChecked();
    await expect(group.getByRole('group', { name: 'Planned' }).getByRole('radio', { name: 'Payments' })).toBeVisible();
    await expect(group.getByRole('group', { name: 'Closed' }).getByRole('radio', { name: 'Launch' })).toBeVisible();
  });

  await ev.step('3. Choose `radio "Payments"` in `radiogroup "Milestone"`', async () => {
    await page.getByRole('radiogroup', { name: 'Milestone' }).getByRole('radio', { name: 'Payments' }).check();
    await expect(page).toHaveURL(/milestone=ex-m3/);
    await expect(page.getByRole('button', { name: 'Milestone Payments', exact: true })).toBeVisible();
  });
});
