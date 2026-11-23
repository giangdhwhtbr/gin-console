// TC: TC-UI-350@7fe25837
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

test('TC-UI-350: Remove the current milestone chip (REQ-UI-144)', async ({ page, ev }) => {
  // Precondition: current milestone ex-m2 "Checkout v2"; no milestone in the URL; 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], beads, milestoneOptions: options });
  const link = (title: string) => page.getByRole('link', { name: title });

  await ev.step('1. Open `/beads?project=example`', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('button', { name: 'Milestone Checkout v2', exact: true })).toBeVisible();
    await expect(link('In checkout')).toBeVisible();
    await expect(link('In payments')).toHaveCount(0);
  });

  await ev.step('2. Click `button "Remove Milestone filter"`', async () => {
    await page.getByRole('button', { name: 'Remove Milestone filter' }).click();
    await expect(page).toHaveURL(/milestone=all/);
    await expect(page.getByRole('button', { name: 'Milestone', exact: true })).toBeVisible();
    for (const t of ['In checkout', 'In payments', 'Loose bead']) await expect(link(t)).toBeVisible();
  });
});
