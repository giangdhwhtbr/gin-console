// TC: TC-UI-028@ade394aa
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-028: Headlines (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: a report with 41 closed beads and rework rate 0.09; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    report: { closed: 41, reworkRate: 0.09 },
  });

  await ev.step('1. Open `/reports?project=alpha&tab=delivery`', async () => {
    await page.goto('/reports?project=alpha&tab=delivery');
    await expect(page.getByRole('tab', { name: /^Delivery/ })).toContainText('41 beads closed');
    await expect(page.getByRole('tab', { name: /^Quality/ })).toContainText('9% rework');
    await expect(page.getByRole('tab', { name: /^AI usage/ })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^Data coverage/ })).toHaveCount(0);
  });
});
