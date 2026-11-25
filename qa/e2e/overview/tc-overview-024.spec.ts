// TC: TC-OVERVIEW-024@7ad47701
// TC: TC-OVERVIEW-024@x
import { test, expect } from '../evidence';
import { epicWorkflow, overview, overviewProject, stubApi } from '../support/api';
import { epics, signIn } from '../support/overview';

test('TC-OVERVIEW-024: Bounded requests (REQ-OVERVIEW-008)', async ({ page, ev }) => {
  // Precondition: 14 epics in progress; each workflow request stays open for 200 ms.
  await signIn(page);
  await stubApi(page, { projects: ['a'], overview: overview([overviewProject('a', { epics: epics(14) })]) });
  let open = 0;
  let most = 0;
  let total = 0;
  await page.route(/\/api\/beads\/a\/[^/]+\/workflow$/, async (route) => {
    open += 1;
    total += 1;
    most = Math.max(most, open);
    await new Promise((resolve) => setTimeout(resolve, 200));
    open -= 1;
    await route.fulfill({ json: epicWorkflow() }).catch(() => undefined);
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
  });

  await ev.step('2. Wait until all workflow requests have ended', async () => {
    await expect(page.getByRole('heading', { name: 'Gates not met (0)' })).toBeVisible();
    expect(total).toBe(14);
    expect(most).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(4);
  });
});
