// TC: TC-UI-030@9d23d0ca
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-030: Team headline (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the team report of an open milestone with 27 of 64 beads closed, pace 3.6 and pace_needed 3.4; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'], team: { closed: 27, scope: 64, pace: 3.6, paceNeeded: 3.4 } });

  await ev.step('1. Open `/reports/delivery?project=alpha`', async () => {
    await page.goto('/reports/delivery?project=alpha');
    const team = page.getByRole('link', { name: /^Team/ });
    await expect(team).toContainText('27 of 64 done, on pace');
    await expect(team.locator('svg')).toHaveCount(0);
  });
});
