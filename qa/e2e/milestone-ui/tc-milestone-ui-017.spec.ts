// TC: TC-MILESTONE-UI-017@ae8253ad
import { test, expect } from '../evidence';
import { failure, stubApi } from '../support/api';

test('TC-MILESTONE-UI-017: Markdown tracking names the Beads fix', async ({ page, ev }) => {
  // Precondition: P has `providers.task_tracking: markdown`, so the API answers 502 with cause "tracking".
  await stubApi(page, { milestones: failure('milestones need providers.task_tracking: beads', 'tracking') });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('This project tracks tasks in markdown');
    await expect(alert).toContainText('Set providers.task_tracking: beads');
  });
});
