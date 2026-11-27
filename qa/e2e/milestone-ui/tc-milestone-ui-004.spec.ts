// TC: TC-MILESTONE-UI-004@82f1504d
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-004: Schedule error replaces progress and warnings', async ({ page, ev }) => {
  // Precondition: P reports M1 normally and M2 with a dependency-cycle error.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestones: list([
      entry('M1', { title: 'Alpha launch', status: 'active', epics: { total: 4, closed: 1 }, warnings: 2 }),
      entry('M2', { title: 'Beta launch', warnings: null, error: 'dependency cycle: A -> B -> A' }),
    ]),
  });

  await ev.step('1. Open /milestones?project=P&view=list', async () => {
    await page.goto('/milestones?project=P&view=list');
    const rows = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    const m2 = rows.filter({ hasText: 'Beta launch' });
    await expect(m2.getByText('dependency cycle: A -> B -> A')).toBeVisible();
    await expect(m2.locator('[data-strand]')).toHaveCount(0);
    await expect(m2).not.toContainText(/\d\/\d|warning|None/);
    const m1 = rows.filter({ hasText: 'Alpha launch' });
    await expect(m1.getByRole('img', { name: '1 done, 3 ready of 4 epics' })).toBeVisible();
    await expect(m1.locator('[data-strand="1/4"]')).toContainText('1/4');
    await expect(m1).toContainText('2 warnings');
  });
});
