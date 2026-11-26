// TC: TC-REPORTS-101@e90e6c07
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-REPORTS-101: Bugs section on a phone (REQ-REPORTS-043)', async ({ page, ev }) => {
  // Precondition: alpha has a bugs report with a long bug title and a long epic title; the window is 390px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 390, height: 844 });
  const long = 'A very long bug title that keeps going and going so that the table cannot fit a phone';
  await stubReports(page, {
    projects: ['alpha'],
    bugs: {
      epics: [{ id: 'e-2', title: 'An epic with a very long title that also needs more room than a phone has', opened: 5, closed: 4, open_now: 1 }],
      open: [{ id: 'a-1', title: long, priority: 0, assignee: 'ann', age_days: 43, epic: { id: 'e-2', title: 'An epic with a very long title that also needs more room than a phone has' } }],
    },
  });

  await ev.step('1. Open `/reports/bugs?project=alpha&days=30`', async () => {
    await page.goto('/reports/bugs?project=alpha&days=30');
    const section = page.getByRole('region', { name: 'Open bugs' });
    await expect(section.getByRole('link', { name: long })).toBeVisible();
    const frame = section.getByRole('table').locator('xpath=..');
    expect(await frame.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
