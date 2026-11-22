// TC: TC-UI-078@d3bf3c07
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-078: Quality figures', async ({ page, ev }) => {
  // Preconditions: ann (4 closed, 1 reopen), bao (1 closed, 1 bug), rework rate 0.4; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, {
    projects: ['alpha'],
    report: {
      closed: 5, reworkRate: 0.4,
      members: [
        { member: 'ann', closed: 4, reopens: 1, bugs: 0, rework_rate: 0.25 },
        { member: 'bao', closed: 1, reopens: 0, bugs: 1, rework_rate: 1 },
      ],
    },
  });

  await ev.step('1. Open `/reports?project=alpha&tab=quality`', async () => {
    await page.goto('/reports?project=alpha&tab=quality');
    await expect(page.getByRole('tab', { name: /^Quality/ })).toHaveAttribute('aria-selected', 'true');
    const panel = page.locator('#panel-quality');
    await expect(panel).toContainText('40%');
    await expect(panel).toContainText('ann');
    await expect(panel).toContainText('bao');
    const figure = (term: string) => panel.locator('dl > div').filter({ has: page.getByText(term, { exact: true }) }).locator('dd');
    await expect(figure('Rework rate')).toHaveText('40%');
    await expect(figure('Reopens')).toHaveText('1');
    await expect(figure('Bugs found later')).toHaveText('1');
    for (const [term, source] of [
      ['Rework rate', /Beads interaction log.*discovered-from/],
      ['Reopens', /Beads interaction log/],
      ['Bugs found later', /Beads dependencies/],
    ] as const) {
      await figure(term).hover();
      await expect(page.getByRole('tooltip')).toHaveText(source);
    }
    const rows = panel.getByRole('region', { name: 'Rework by member' }).getByRole('row');
    await expect(rows.filter({ hasText: 'ann' })).toHaveText('ann41025%');
    await expect(rows.filter({ hasText: 'bao' })).toHaveText('bao101100%');
    await expect(panel.getByText(/tokens|review cycles|rejections|findings|waivers/i)).toHaveCount(0);
  });
});
