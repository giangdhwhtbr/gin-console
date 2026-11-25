// TC: TC-OVERVIEW-030@69f474cc
import { test, expect } from '../evidence';
import { failure, overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';

test('TC-OVERVIEW-030: Later failure (REQ-OVERVIEW-010)', async ({ page, ev }) => {
  // Precondition: the lists are shown and the next GET /api/overview fails.
  await signIn(page);
  await page.clock.install();
  let asked = 0;
  await stubApi(page, {
    projects: ['a'],
    overview: () => {
      asked += 1;
      return asked === 1
        ? overview([overviewProject('a', { blocked: [{ id: 't-3', title: 'Title t-3', assignee: null, days: 4, blocker: null }] })])
        : failure('overview is down');
    },
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /t-3/ })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  await ev.step('2. Wait 10 seconds', async () => {
    await page.clock.runFor(10_000);
    await expect(page.getByRole('alert')).toContainText('Could not load the overview (HTTP 502)');
    await expect(page.getByRole('link', { name: /t-3/ })).toBeVisible();
  });
});
