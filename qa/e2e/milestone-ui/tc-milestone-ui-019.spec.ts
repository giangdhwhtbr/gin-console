// TC: TC-MILESTONE-UI-019@1d6e69ac
import { test, expect } from '../evidence';
import { failure, stubApi } from '../support/api';

test('TC-MILESTONE-UI-019: Milestone page shows the same unavailable error', async ({ page, ev }) => {
  // Precondition: P's gin-workflow has no `milestone` command, so every milestones API call answers 502 with cause "outdated".
  const outdated = failure("gin-workflow has no 'milestone' command", 'outdated');
  await stubApi(page, { milestones: outdated, milestone: () => outdated });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Milestones need a newer gin-workflow');
    await expect(alert.getByText('gin-workflow/install.sh', { exact: true })).toBeVisible();
    await expect(alert).toContainText('Run the gin-workflow installer');
  });
});
