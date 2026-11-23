// TC: TC-UI-333@d675704e
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-333: Phone filter bar (REQ-UI-084)', async ({ page, ev }) => {
  // Precondition: the Beads page of project example at 390px, ?project=example&status=open; the current milestone is in effect.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, {
    projects: ['example'],
    milestoneOptions: options,
    beads: [bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2' }), bead('ex-2', { title: 'Ship cart', milestone: 'ex-m2' })],
  });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&status=open');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    const search = page.getByRole('searchbox', { name: 'Search' });
    await expect(search).toBeVisible();
    await expect(page.locator('kbd')).toBeHidden();
    const filters = page.getByRole('button', { name: /^Filters\b/ });
    await expect(filters).toBeVisible();
    await expect(filters).toContainText('1');
    await expect(page.getByRole('button', { name: /^Milestone\b/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Status\b/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Assignee\b/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^More filters/ })).toHaveCount(0);
    // the count and Show closed sit on the line below the search and Filters
    const first = (await search.boundingBox())!;
    const filtersBox = (await filters.boundingBox())!;
    const count = (await page.getByText('2 of 2').boundingBox())!;
    const closed = (await page.getByRole('switch', { name: 'Show closed' }).boundingBox())!;
    expect(Math.abs(first.y - filtersBox.y)).toBeLessThan(4);
    expect(count.y).toBeGreaterThan(first.y + first.height - 1);
    expect(closed.y).toBeGreaterThan(first.y + first.height - 1);
  });
});
