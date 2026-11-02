// TC: TC-MILESTONE-UI-016@c3c204c2
import { test, expect } from '../evidence';
import { failure, stubApi } from '../support/api';

test('TC-MILESTONE-UI-016: Old gin-workflow names the install fix', async ({ page, ev }) => {
  // Precondition: P's gin-workflow has no `milestone` command, so the API answers 502 with cause "outdated".
  await stubApi(page, { milestones: failure("gin-workflow has no 'milestone' command", 'outdated') });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Milestones need a newer gin-workflow');
    await expect(alert.getByText('gin-workflow/install.sh', { exact: true })).toBeVisible();
    await expect(alert).toContainText('Run the gin-workflow installer');
  });
});
