// TC: TC-BEADS-083@442fd6a1
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';
import { stubEpicPage, workflow } from '../support/epic';

test('TC-BEADS-083: Next command of an epic by stage (REQ-BEADS-025)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; open epic e-1 in project P; its workflow answers the stage of each step.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const epic = bead('e-1', { title: 'Checkout epic', issue_type: 'epic', ready: true });
  await stubApi(page, { beads: [epic] });
  await stubBeadDetails(page, 'P', [beadDetail(epic)]);
  let stage = 'plan';
  await stubEpicPage(page, { project: 'P' });
  await page.route(/\/api\/beads\/P\/e-1\/workflow$/, (route) => route.fulfill({ json: workflow({ stage }) }));

  const shows = async (command: string | null) => {
    await page.goto('/beads/P/e-1');
    await expect(page.getByRole('heading', { name: 'Checkout epic', level: 1 })).toBeVisible();
    if (command === null) await expect(page.getByText('Next', { exact: true })).toHaveCount(0);
    else await expect(page.getByText(command, { exact: true })).toBeVisible();
  };

  await ev.step('1. Open `/beads/P/e-1` while its stage is `plan`', async () => { stage = 'plan'; await shows('/gin:plan e-1'); });
  await ev.step('2. Open `/beads/P/e-1` while its stage is `execute`', async () => { stage = 'execute'; await shows('/gin:execute e-1'); });
  await ev.step('3. Open `/beads/P/e-1` while its stage is `progress`', async () => { stage = 'progress'; await shows(null); });
  await ev.step('4. Open `/beads/P/e-1` while its stage is `shipping-soon` (not a known stage)', async () => { stage = 'shipping-soon'; await shows(null); });
});
