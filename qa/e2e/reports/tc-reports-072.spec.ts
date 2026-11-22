// TC: TC-REPORTS-072@112da1bd
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

const row = (id: string, o: Record<string, unknown>) => ({
  id, title: `Bead ${id}`, issue_type: 'task', status: 'open', bucket: 'open', blocked: false, assignee: 'ann', priority: 2,
  created_at: '2026-11-02T09:00:00Z', epic: { id: 'a-e1', title: 'Epic one' }, started_at: null, closed_at: null,
  cycle_days: null, age_days: null, late_days: null, rework: 0, ...o,
});

test('TC-REPORTS-072: Bead status as glyph and word', async ({ page, ev }) => {
  // Precondition: the team report of m2 has open beads, some of them blocked, and one in progress and one closed.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page);
  await page.route('**/api/reports/team**', (route) =>
    route.fulfill({
      json: {
        ...teamBody('alpha'),
        beads: [
          row('a-1', {}),
          row('a-2', { blocked: true }),
          row('a-3', { status: 'in_progress', bucket: 'in_progress', started_at: '2026-11-09T09:00:00Z', age_days: 3 }),
          row('a-4', { status: 'closed', bucket: 'closed', closed_at: '2026-11-10T09:00:00Z', cycle_days: 1 }),
        ],
      },
    }),
  );
  const mark = async (id: string, state: string, word: string) => {
    const status = page.getByRole('row').filter({ hasText: id }).locator(`[data-state="${state}"]`);
    await expect(status).toHaveText(word);
    await expect(status.locator(`svg[data-glyph="${state === 'ready' ? 'ready' : state}"]`)).toHaveCount(1);
  };

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /reports?project=alpha&tab=team&milestone=m2', async () => {
    await page.goto('/reports?project=alpha&tab=team&milestone=m2');
    await expect(page.getByRole('tab', { name: /^Open/ })).toBeVisible();
  });

  await ev.step('3. Select the Open list', async () => {
    await page.getByRole('tab', { name: /^Open/ }).click();
    await expect(page.getByRole('row').filter({ hasText: 'a-1' })).toBeVisible();
    await mark('a-1', 'ready', 'Open');
    await mark('a-2', 'blocked', 'Blocked');
  });

  await ev.step('4. Select the All list', async () => {
    await page.getByRole('tab', { name: /^All/ }).click();
    await expect(page.getByRole('row').filter({ hasText: 'a-4' })).toBeVisible();
    await mark('a-1', 'ready', 'Open');
    await mark('a-2', 'blocked', 'Blocked');
    await mark('a-3', 'in_progress', 'In progress');
    await mark('a-4', 'done', 'Closed');
  });
});
