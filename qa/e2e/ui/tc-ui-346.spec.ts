// TC: TC-UI-346@c2a9cf84
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-346: Unknown filter values are ignored (REQ-UI-143)', async ({ page, ev }) => {
  // Precondition: project example with its current milestone in effect; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { projects: ['example'], milestoneOptions: options, beads: [bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2' })] });

  await ev.step('1. Open `/beads?project=example&kind=epicish&label_mode=some`', async () => {
    await page.goto('/beads?project=example&kind=epicish&label_mode=some');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'More filters', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
    await page.getByRole('button', { name: 'More filters', exact: true }).click();
    const more = page.getByRole('dialog', { name: 'More filters' });
    await expect(more.getByRole('combobox', { name: 'Kind' })).toHaveValue('');
    await expect(more.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'true');
    await expect(more.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'false');
  });
});
