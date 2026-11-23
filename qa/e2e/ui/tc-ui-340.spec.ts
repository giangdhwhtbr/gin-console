// TC: TC-UI-340@3f8db178
import { test, expect } from '../evidence';
import { stubExample, stubDetails, E12, e12 } from '../support/lanes';
import { stubEpicPage } from '../support/epic';

test('TC-UI-340: Filter bar on the Graph tab of an epic page (REQ-UI-142)', async ({ page, ev }) => {
  // Precondition: epic ex-e12 exists in project example; window 1440px.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubExample(page, e12());
  await stubDetails(page, e12());
  await stubEpicPage(page);

  await ev.step('1. Open the Graph tab of epic `ex-e12`', async () => {
    await page.goto(`/beads/example/${E12}?tab=graph`);
    await expect(page.getByRole('tab', { name: 'Graph' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('graph-canvas')).toBeVisible();
    for (const p of [
      page.getByRole('searchbox', { name: 'Search' }),
      page.getByRole('button', { name: 'Status', exact: true }),
      page.getByRole('button', { name: 'Assignee', exact: true }),
      page.getByRole('button', { name: 'More filters', exact: true }),
      page.getByRole('switch', { name: 'Show closed' }),
    ]) await expect(p).toBeVisible();
    await expect(page.getByRole('button', { name: /^Milestone\b/ })).toHaveCount(0);
    await expect(page.getByText(/^\d+ of \d+$/)).toHaveCount(0);
  });
});
