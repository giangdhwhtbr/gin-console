// TC: TC-OVERVIEW-025@6da61dec
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi, type OverviewProject } from '../support/api';
import { section, signIn } from '../support/overview';

const blocked = (id: string, days: number): OverviewProject['blocked'][number] => ({ id, title: `Title ${id}`, assignee: null, days, blocker: null });

test('TC-OVERVIEW-025: More than ten (REQ-OVERVIEW-009)', async ({ page, ev }) => {
  // Precondition: 12 blocked beads in three projects, waiting 1 to 12 working days.
  await signIn(page);
  await stubApi(page, {
    projects: ['a', 'b', 'c'],
    overview: overview([
      overviewProject('a', { blocked: [12, 9, 6, 3].map((d) => blocked(`a-${d}`, d)) }),
      overviewProject('b', { blocked: [11, 8, 5, 2].map((d) => blocked(`b-${d}`, d)) }),
      overviewProject('c', { blocked: [10, 7, 4, 1].map((d) => blocked(`c-${d}`, d)) }),
    ]),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    const list = section(page, 'Blocked (12)');
    await expect(list.getByRole('listitem')).toHaveCount(10);
    await expect(list.getByRole('link', { name: /Title a-12/ })).toBeVisible(); // the longest wait comes first
    await expect(list.getByRole('link', { name: /Title a-3/ })).toBeVisible(); // 3 working days: the tenth
    await expect(list.getByRole('link', { name: /Title b-2/ })).toHaveCount(0);
    await expect(list.getByRole('link', { name: /Title c-1$/ })).toHaveCount(0);
  });

  await ev.step('2. Click "Show all" under Blocked', async () => {
    const list = section(page, 'Blocked (12)');
    await list.getByRole('button', { name: 'Show all' }).click();
    await expect(list.getByRole('listitem')).toHaveCount(12);
    await expect(list.getByRole('link', { name: /Title b-2/ })).toBeVisible();
    await expect(list.getByRole('link', { name: /Title c-1$/ })).toBeVisible();
    await expect(list.getByRole('button', { name: 'Show all' })).toHaveCount(0);
  });
});
