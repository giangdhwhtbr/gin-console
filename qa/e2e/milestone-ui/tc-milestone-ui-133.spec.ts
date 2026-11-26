// TC: TC-MILESTONE-UI-133@46c79879
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { historyList, timeline } from '../support/timeline';

test('TC-MILESTONE-UI-133: Closed history is off by default', async ({ page, ev }) => {
  // Precondition: the project of TC-MILESTONE-UI-132; today is 12 Nov 2026.
  await stubApi(page, { projects: ['example'], milestones: historyList() });

  await ev.step('1. Open /milestones?project=example', async () => {
    await page.goto('/milestones?project=example');
    const chart = timeline(page);
    await expect(chart.getByRole('checkbox', { name: 'Show closed' })).not.toBeChecked();
    expect(new URL(page.url()).searchParams.has('closed')).toBe(false);
    for (const title of ['Discovery', 'Prototype', 'Foundations', 'Search relevance']) {
      await expect(chart.getByText(title)).toHaveCount(0);
    }
    await expect(chart.getByRole('link', { name: 'Beta readiness' })).toBeVisible();
  });
});
