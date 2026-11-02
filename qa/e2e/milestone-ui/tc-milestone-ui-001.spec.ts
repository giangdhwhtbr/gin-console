// TC: TC-MILESTONE-UI-001@f79e2eec
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-001: List milestones with status, period, progress and warnings', async ({ page, ev }) => {
  // Precondition: P reports M1 (active) and M2 (planned); another project comes first so selecting P is a real change.
  await stubApi(page, {
    projects: ['other', 'P'],
    milestones: (url) =>
      url.searchParams.get('project') === 'P'
        ? list([
            entry('M1', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-11-13', epics: { total: 4, closed: 1 }, warnings: 2 }),
            entry('M2', { title: 'Beta launch', status: 'planned', start: '2026-11-16', end: '2026-11-27', epics: { total: 3, closed: 0 }, warnings: 0 }),
          ])
        : list([]),
  });

  await ev.step('1. Open /milestones', async () => {
    await page.goto('/milestones');
    await expect(page.getByRole('heading', { name: 'Milestones' })).toBeVisible();
  });

  await ev.step('2. Select project P', async () => {
    await page.getByLabel('Project').selectOption('P');
    await expect(page).toHaveURL(/[?&]project=P(&|$)/);
    const rows = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    const m1 = rows.filter({ hasText: 'Alpha launch' });
    await expect(m1).toContainText('Active');
    await expect(m1).toContainText('2 Nov – 13 Nov');
    await expect(m1.getByRole('progressbar', { name: 'Epics closed in Alpha launch' })).toHaveAttribute('aria-valuenow', '1');
    await expect(m1).toContainText('1 of 4');
    await expect(m1).toContainText('2 warnings');
    const m2 = rows.filter({ hasText: 'Beta launch' });
    await expect(m2).toContainText('Planned');
    await expect(m2).toContainText('16 Nov – 27 Nov');
    await expect(m2).toContainText('0 of 3');
    await expect(m2).toContainText('None');
  });
});
