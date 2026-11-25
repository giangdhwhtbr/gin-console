// TC: TC-UI-386@0a179fdf
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';
import { stubEpicPage, workflow } from '../support/epic';

test('TC-UI-386: Next command of an epic by stage on its page (REQ-UI-151)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; epic e-1 in project P; its workflow request is held, answers stage plan, then fails.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const epic = bead('e-1', { title: 'Checkout epic', issue_type: 'epic', ready: true });
  await stubApi(page, { beads: [epic] });
  await stubBeadDetails(page, 'P', [beadDetail(epic)]);
  await stubEpicPage(page, { project: 'P' });
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let fail = false;
  await page.route(/\/api\/beads\/P\/e-1\/workflow$/, async (route) => {
    if (fail) return route.fulfill({ status: 502, json: { error: 'workflow unavailable' } });
    await held;
    return route.fulfill({ json: workflow({ stage: 'plan' }) });
  });
  const next = page.getByText('Next', { exact: true });

  await ev.step('1. Open `/beads/P/e-1` while the workflow request is not answered yet', async () => {
    await page.goto('/beads/P/e-1');
    await expect(page.getByRole('heading', { name: 'Checkout epic', level: 1 })).toBeVisible();
    await expect(next).toHaveCount(0);
  });
  await ev.step('2. Wait for the workflow request to answer with the stage `plan`', async () => {
    release();
    await expect(page.getByText('/gin:plan e-1', { exact: true })).toBeVisible();
  });
  await ev.step('3. Open `/beads/P/e-1` again with the workflow request failing with 502', async () => {
    fail = true;
    await page.goto('/beads/P/e-1');
    await expect(page.getByRole('heading', { name: 'Checkout epic', level: 1 })).toBeVisible();
    await expect(page.getByText('workflow unavailable').first()).toBeVisible();
    await expect(next).toHaveCount(0);
  });
});
