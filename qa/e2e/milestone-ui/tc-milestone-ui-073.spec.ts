// TC: TC-MILESTONE-UI-073@81a0353d
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-073: Milestone without dates', async ({ page, ev }) => {
  // Precondition: P's `milestone list` reports M1 (active) and M4 with no start, no end and an error.
  await stubApi(page, {
    milestones: list([
      entry('M1', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-11-13', epics: { total: 4, closed: 1 }, warnings: 2 }),
      entry('M4', { title: 'Undated launch', start: null, end: null, finish: null, warnings: null, error: 'M4 has no start/end metadata' }),
    ]),
  });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    const rows = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    const m1 = rows.filter({ hasText: 'Alpha launch' });
    await expect(m1).toContainText('2 Nov – 13 Nov');
    await expect(m1.locator('[data-strand="1/4"]')).toHaveText('1/4');
    await expect(m1.getByRole('img', { name: /of 4 epics$/ })).toBeVisible();
    await expect(m1).toContainText('2 warnings');
    const m4 = rows.filter({ hasText: 'Undated launch' });
    await expect(m4).toContainText('No dates');
    await expect(m4).toContainText('M4 has no start/end metadata');
  });
});
