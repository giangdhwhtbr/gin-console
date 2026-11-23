// TC: TC-UI-337@85d74b1b
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-337: Filter bar order on a wide window (REQ-UI-142)', async ({ page, ev }) => {
  // Precondition: project example, current milestone ex-m2 "Checkout v2", no other filter; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['example'],
    milestoneOptions: options,
    beads: [bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2' }), bead('ex-2', { title: 'Ship cart', milestone: 'ex-m2' }), bead('ex-3', { title: 'Other', milestone: null })],
  });

  await ev.step('1. Open `/beads?project=example`', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    const parts = [
      page.getByRole('searchbox', { name: 'Search' }),
      page.getByRole('button', { name: 'Milestone Checkout v2' }),
      page.getByRole('button', { name: 'Status', exact: true }),
      page.getByRole('button', { name: 'Assignee', exact: true }),
      page.getByRole('button', { name: 'More filters' }),
      page.getByText('2 of 3'),
      page.getByRole('switch', { name: 'Show closed' }),
    ];
    await expect(page.locator('kbd')).toHaveText('/');
    const boxes = [];
    for (const p of parts) {
      await expect(p).toBeVisible();
      boxes.push((await p.boundingBox())!);
    }
    const mid = (b: { y: number; height: number }) => b.y + b.height / 2;
    for (let i = 0; i < boxes.length; i++) {
      expect(Math.abs(mid(boxes[i]) - mid(boxes[0]))).toBeLessThan(8);
      if (i > 0) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width - 1);
    }
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
  });
});
