// TC: TC-UI-028@ade394aa
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-028: Headlines (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: a report with 41 closed beads, 12,400,000 tokens, cost 38.2, rework rate 0.09, 3 beads not collected, 1 unreadable bead and 1 unpriced model; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    report: { closed: 41, tokens: 12_400_000, cost: 38.2, reworkRate: 0.09, notCollected: 3, invalid: 1, unpriced: 1 },
  });

  await ev.step('1. Open `/reports?project=alpha&tab=delivery`', async () => {
    await page.goto('/reports?project=alpha&tab=delivery');
    await expect(page.getByRole('tab', { name: /^Delivery/ })).toContainText('41 beads closed');
    await expect(page.getByRole('tab', { name: /^AI usage/ })).toContainText('12.4M tokens, $38.20');
    await expect(page.getByRole('tab', { name: /^Quality/ })).toContainText('9% rework');
    const coverage = page.getByRole('tab', { name: /^Data coverage/ });
    await expect(coverage).toContainText('5 gaps');
    await expect(coverage.locator('svg')).toHaveCount(1);
  });
});
