// TC: TC-REPORTS-071@71574834
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-071: Scope by status is a strand with a legend', async ({ page, ev }) => {
  // Precondition: the team report of m2 has scope 64 of which 27 closed; 10 in progress, 5 blocked and 22 ready among the 27 open.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page);
  await page.route('**/api/reports/team**', (route) => {
    const body = teamBody('alpha');
    return route.fulfill({
      json: { ...body, team: { ...body.team, scope: 64, closed: 27, in_progress: 10, open: 27, blocked: 5, unclaimed: 0, done: 27 / 64 } },
    });
  });

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open `/reports/team?project=alpha&milestone=m2`', async () => {
    await page.goto('/reports/team?project=alpha&milestone=m2');
    await expect(page.getByRole('group', { name: 'Key figures' }).getByText('27 of 64', { exact: true })).toBeVisible();
  });

  await ev.step('3. Look at "Scope by status" under the figures', async () => {
    const scope = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Scope by status' }) });
    // Ready is Open without blocked: 27 - 5 = 22.
    const strand = scope.getByRole('img', { name: '27 done, 10 in progress, 5 blocked, 22 ready of 64 beads' });
    await expect(strand).toBeVisible();
    await expect(strand.locator('[data-segment]')).toHaveCount(4);
    const legend = scope.getByRole('list');
    for (const [state, word, n] of [['done', 'Done', '27'], ['in_progress', 'In progress', '10'], ['ready', 'Ready', '22'], ['blocked', 'Blocked', '5']]) {
      const item = legend.getByRole('listitem').filter({ hasText: new RegExp(`^${word} ${n}$`) });
      await expect(item).toHaveCount(1);
      await expect(item.locator(`svg[data-glyph="${state}"]`)).toHaveCount(1);
    }
  });
});
