// TC: TC-MILESTONE-UI-018@129bcd00
import { test, expect } from '../evidence';
import { failure, stubApi } from '../support/api';

test('TC-MILESTONE-UI-018: Unknown schema is reported and nothing is listed', async ({ page, ev }) => {
  // Precondition: `milestone list` for P reports `schema: 2`, so the API answers 502 with cause "schema".
  await stubApi(page, { milestones: failure('gin-workflow reports milestone schema 2', 'schema') });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('gin-workflow reports milestone schema 2');
    await expect(alert).toContainText('This console reads schema 1');
    await expect(page.getByRole('list', { name: 'Milestones' })).toHaveCount(0);
  });
});
