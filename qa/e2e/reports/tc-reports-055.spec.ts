// TC: TC-REPORTS-055@67e21423
import { test, expect } from '../evidence';
import { failure } from '../support/api';
import { stubReports } from '../support/reports';

test('TC-REPORTS-055: Milestones request fails (REQ-REPORTS-018)', async ({ page, ev }) => {
  // Precondition: GET /api/milestones?project=alpha answers 502 with cause "outdated".
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['alpha'], milestones: failure('this gin has no milestone command', 'outdated') as never });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/reports/velocity?project=alpha`', async () => {
    await page.goto('/reports/velocity?project=alpha');
    const panel = page.getByRole('region', { name: 'Velocity' });
    await expect(panel.getByText('Milestones need a newer gin')).toBeVisible();
    await expect(panel.getByText(/days per point/)).toHaveCount(0);
  });
});
