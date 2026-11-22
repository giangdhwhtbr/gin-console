// TC: TC-MILESTONE-UI-106@1b5f3e96
import { test, expect } from '../evidence';
import { bead, failure, stubApi } from '../support/api';
import { detailOf } from '../support/shell';

test('TC-MILESTONE-UI-106: Milestones unavailable', async ({ page, ev }) => {
  // Precondition: P has milestone bead ex-m2 (open); GET /api/beads/milestones answers 502.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const ex = bead('ex-m2', { title: 'Title ex-m2', issue_type: 'milestone', status: 'open' });
  await stubApi(page, { beads: [ex], milestoneOptions: failure('milestones unavailable') });
  await page.route(/\/api\/beads\/P\/ex-m2(\?.*)?$/, (route) => route.fulfill({ json: detailOf(ex) }));
  await page.route(/\/api\/beads\/P\/ex-m2\/comments(\?.*)?$/, (route) => route.fulfill({ json: [] }));

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /beads/P/ex-m2', async () => {
    await page.goto('/beads/P/ex-m2');
    await expect(page.getByRole('heading', { name: 'Title ex-m2' })).toBeVisible();
    await expect(page.locator('main [data-state="deferred"]')).toHaveText('Deferred');
    await expect(page.locator('main')).not.toContainText(/\b(Active|Planned|Scheduled)\b/);
  });
});
