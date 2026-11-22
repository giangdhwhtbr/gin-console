// TC: TC-UI-272@0a593523
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProjectPulls } from '../support/pull';

test.use({ timezoneId: 'UTC' });

test('TC-UI-272: Dates in the current and other years', async ({ page, ev }) => {
  // Precondition: the browser date is 21 Nov 2026; three beads of alpha carry the three updated_at values.
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
  await page.setViewportSize({ width: 1600, height: 900 });
  await stubProjectPulls(
    page,
    [{ name: 'alpha', path: '/tmp/alpha', beads: { open: 3, in_progress: 0, blocked: 0, ready: 0, epics: [] } }],
    [
      bead('d-1', { title: 'Same year', updated_at: '2026-11-05T09:00:00Z' }),
      bead('d-2', { title: 'Other year', updated_at: '2025-12-01T09:00:00Z' }),
      bead('d-3', { title: 'With time', updated_at: '2026-05-11T16:00:00Z' }),
    ],
  );

  const d3 = bead('d-3', { title: 'With time', updated_at: '2026-05-11T16:00:00Z' });
  await page.route('**/api/beads/alpha/d-3', (route) =>
    route.fulfill({
      json: { ...d3, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] },
    }),
  );
  await page.route('**/api/beads/alpha/d-3/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=list`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    const row = (t: string) => page.getByRole('treeitem').filter({ hasText: t });
    await expect(row('Same year')).toContainText('5 Nov');
    await expect(row('Same year')).not.toContainText('2026');
    await expect(row('Other year')).toContainText('1 Dec 2025');
    await expect(row('With time')).toContainText('11 May');
    await expect(page.locator('body')).not.toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });

  await ev.step('2. Open `/beads/alpha/d-3`', async () => {
    await page.goto('/beads/alpha/d-3');
    await expect(page.getByText('11 May, 16:00')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });
});
