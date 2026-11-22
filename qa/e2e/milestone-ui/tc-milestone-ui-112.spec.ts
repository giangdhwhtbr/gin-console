// TC: TC-MILESTONE-UI-112@76df0be6
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-112: Older gin-workflow without lanes', async ({ page, ev }) => {
  // Precondition: P's milestone entries carry no `lanes` key (the entry builder omits it).
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    projects: ['P'],
    milestones: () =>
      list([
        entry('M1', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-11-13', epics: { total: 4, closed: 1 } }),
        entry('M2', { title: 'Beta launch', status: 'planned', start: '2026-11-16', end: '2026-11-27', epics: { total: 3, closed: 0 } }),
      ]),
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('heading', { name: 'Milestones' })).toBeVisible();
    const rows = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem').filter({ hasText: 'launch' });
    await expect(rows).toHaveCount(2);
    for (const title of ['Alpha launch', 'Beta launch']) {
      const row = rows.filter({ hasText: title });
      // Lanes cell is the first dash in DOM order; the second is Commitment met.
      await expect(row.getByText('–', { exact: true }).first()).toBeVisible();
      await expect(row).not.toContainText('lane');
    }
    await expect(rows.filter({ hasText: 'Alpha launch' })).toContainText('2 Nov – 13 Nov');
    await expect(rows.filter({ hasText: 'Alpha launch' })).toContainText('1 of 4');
    await expect(rows.filter({ hasText: 'Beta launch' })).toContainText('16 Nov – 27 Nov');
    await expect(rows.filter({ hasText: 'Beta launch' })).toContainText('0 of 3');
  });
});
