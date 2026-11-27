// TC: TC-MILESTONE-UI-001@5ec1f9bc
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';
import { projectList, sidebarSwitcher } from '../support/shell';

test('TC-MILESTONE-UI-001: List milestones with status, period, progress and warnings', async ({ page, ev }) => {
  // Precondition: P reports M1 (active, 2 of 6 epics closed) and M2 (planned, 2 warnings); another project comes first so selecting P is a real change.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    projects: ['other', 'P'],
    milestones: (url) =>
      url.searchParams.get('project') === 'P'
        ? list([
            entry('M1', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-11-13', epics: { total: 6, closed: 2 }, warnings: 0 }),
            entry('M2', { title: 'Beta launch', status: 'planned', start: '2026-11-16', end: '2026-11-27', epics: { total: 3, closed: 0 }, warnings: 2 }),
          ])
        : list([]),
  });

  await ev.step('1. Open /milestones', async () => {
    await page.goto('/milestones');
    await expect(page.getByRole('heading', { name: 'Milestones' })).toBeVisible();
  });

  await ev.step('2. Select project P', async () => {
    await sidebarSwitcher(page, 'other').click();
    await projectList(page).getByRole('button', { name: 'P', exact: true }).click();
    await expect(page).toHaveURL(/[?&]project=P(&|$)/);
  });

  await ev.step('3. Press List in the View row', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'List', exact: true }).click();
    await expect(page).toHaveURL(/[?&]view=list(&|$)/);
    await expect(page).toHaveURL(/[?&]project=P(&|$)/);
    const rows = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    const m1 = rows.filter({ hasText: 'Alpha launch' });
    await expect(m1.locator('[data-status="active"]')).toHaveText('Active');
    await expect(m1.locator('[data-status="active"] svg')).toHaveCount(1);
    await expect(m1).toContainText('2 Nov – 13 Nov');
    await expect(m1.getByRole('img', { name: '2 done, 4 ready of 6 epics' })).toBeVisible();
    await expect(m1.locator('[data-strand="2/6"]')).toContainText('2/6');
    const m2 = rows.filter({ hasText: 'Beta launch' });
    await expect(m2.locator('[data-status="planned"]')).toHaveText('Planned');
    await expect(m2.locator('[data-status="planned"] svg')).toHaveCount(1);
    await expect(m2).toContainText('16 Nov – 27 Nov');
    await expect(m2.locator('[data-strand="0/3"]')).toContainText('0/3');
    await expect(m2).toContainText('2 warnings');
    const warning = m2.locator('span.text-state-blocked', { hasText: '2 warnings' });
    await expect(warning).toHaveCount(1);
    await expect(warning.locator('svg[data-glyph="deferred"]')).toHaveCount(1);
  });
});
