// TC: TC-MILESTONE-UI-141@1f90d992
// TC: TC-MILESTONE-UI-141
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';
import { projectList, sidebarSwitcher } from '../support/shell';
import { timeline } from '../support/timeline';

test('TC-MILESTONE-UI-141: Project redirect and project switch keep view and closed', async ({ page, ev }) => {
  // Precondition: a and b each report one milestone; a comes first.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    projects: ['a', 'b'],
    milestones: (url) =>
      list([
        url.searchParams.get('project') === 'b'
          ? entry('mb', { title: 'Beta launch', status: 'active', start: '2026-11-02', end: '2026-11-27' })
          : entry('ma', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-11-27' }),
      ]),
  });

  await ev.step('1. Open /milestones?view=list&closed=1&zoom=weeks', async () => {
    await page.goto('/milestones?view=list&closed=1&zoom=weeks');
    await expect(page.getByRole('list', { name: 'Milestones' })).toBeVisible();
    await expect(timeline(page)).toHaveCount(0);
    const query = new URL(page.url()).searchParams;
    expect(Object.fromEntries(query)).toEqual({ view: 'list', closed: '1', zoom: 'weeks', project: 'a' });
  });

  await ev.step('2. Open the project switcher and choose b', async () => {
    await sidebarSwitcher(page, 'a').click();
    await projectList(page).getByRole('button', { name: 'b', exact: true }).click();
    await expect(page).toHaveURL(/[?&]project=b(&|$)/);
    const query = new URL(page.url()).searchParams;
    expect(Object.fromEntries(query)).toEqual({ project: 'b', view: 'list', closed: '1' });
    await expect(page.getByRole('list', { name: 'Milestones' }).getByText('Beta launch')).toBeVisible();
  });
});
