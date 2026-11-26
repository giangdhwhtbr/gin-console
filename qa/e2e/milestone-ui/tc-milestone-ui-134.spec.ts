// TC: TC-MILESTONE-UI-134@ede3d35f
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';
import { timeline } from '../support/timeline';

test('TC-MILESTONE-UI-134: No open work to forecast', async ({ page, ev }) => {
  // Precondition: closed milestones only and a null forecast; today is 12 Nov 2026.
  await stubApi(page, {
    projects: ['example'],
    milestones: list(
      [
        entry('ex-m0a', { title: 'Discovery', status: 'closed', start: '2026-08-03', end: '2026-09-04', finish: '2026-09-04' }),
        entry('ex-m1', { title: 'Foundations', status: 'closed', start: '2026-10-05', end: '2026-10-30', finish: '2026-10-30' }),
      ],
      { today: '2026-11-12', forecast: null },
    ),
  });

  await ev.step('1. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    await expect(timeline(page).getByText('No open work to forecast')).toBeVisible();
    await expect(timeline(page).getByRole('link')).toHaveCount(0);
  });

  await ev.step('2. Turn on "Show closed"', async () => {
    await timeline(page).getByRole('checkbox', { name: 'Show closed' }).check();
    await expect(timeline(page).getByText('No open work to forecast')).toBeVisible();
    await expect(timeline(page).getByRole('link')).toHaveText(['Discovery', 'Foundations']);
  });
});
