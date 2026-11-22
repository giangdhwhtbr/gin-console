// TC: TC-UI-273@37ceb09d
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-UI-273: Date ranges', async ({ page, ev }) => {
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00'));
  await stubApi(page, {
    projects: ['alpha'],
    milestones: () =>
      list([
        entry('M1', { title: 'Current year', status: 'active', start: '2026-11-10', end: '2026-12-01' }),
        entry('M2', { title: 'Past year', status: 'planned', start: '2025-11-03', end: '2025-11-28' }),
        entry('M3', { title: 'Next year', status: 'planned', start: '2026-12-14', end: '2027-01-08' }),
      ]),
  });

  await ev.step('1. Open `/milestones?project=alpha`', async () => {
    await page.goto('/milestones?project=alpha');
    const rows = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem');
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: 'Current year' })).toContainText('10 Nov – 1 Dec');
    await expect(rows.filter({ hasText: 'Past year' })).toContainText('3 Nov – 28 Nov 2025');
    await expect(rows.filter({ hasText: 'Next year' })).toContainText('14 Dec 2026 – 8 Jan 2027');
  });
});
