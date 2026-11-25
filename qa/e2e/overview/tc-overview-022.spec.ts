// TC: TC-OVERVIEW-022@d1f161c4
// TC: TC-OVERVIEW-022@x
import { test, expect } from '../evidence';
import { epicWorkflow, overview, overviewProject, stubApi } from '../support/api';
import { epics, signIn } from '../support/overview';

test('TC-OVERVIEW-022: Still checking (REQ-OVERVIEW-008)', async ({ page, ev }) => {
  // Precondition: 14 epics in progress; the first 5 workflow requests are answered and the others stay open.
  await signIn(page);
  await stubApi(page, { projects: ['a'], overview: overview([overviewProject('a', { epics: epics(14) })]) });
  let asked = 0;
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/api\/beads\/a\/[^/]+\/workflow$/, async (route) => {
    asked += 1;
    if (asked > 5) await held;
    await route.fulfill({ json: epicWorkflow() }).catch(() => undefined); // the page may be closed when the test ends
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    const gates = page.getByRole('heading', { name: 'Gates not met' });
    const waivers = page.getByRole('heading', { name: 'Waivers' });
    await expect(gates).toBeVisible();
    await expect(waivers).toBeVisible();
    await expect(page.getByText('Checking 5 of 14')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: /^Gates not met \(/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Waivers \(/ })).toHaveCount(0);
    release();
  });
});
