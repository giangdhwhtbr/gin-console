// TC: TC-MILESTONE-UI-003@614cb8b6
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-003: Unassigned epics count not shown', async ({ page, ev }) => {
  // Precondition: P's `milestone list` reports unassigned_epics: 4 (and one milestone, so the list renders).
  await stubApi(page, { milestones: list([entry('M1', { title: 'Alpha launch' })], { unassigned_epics: 4 }) });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('list', { name: 'Milestones' }).getByRole('listitem').filter({ hasText: 'Alpha launch' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Epics not in a milestone/ })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/roadmap epics?/i);
    await expect(page.locator('body')).not.toContainText(/\b4\b[^.]*\bepics?\b/i);
  });
});
