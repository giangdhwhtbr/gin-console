// TC: TC-UI-385@4b52dc5f
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';

test('TC-UI-385: Next command on a ready task and its copy (REQ-UI-151)', async ({ page, context, ev }) => {
  // Preconditions: email ann@x.com; ready task t-1 without an assignee blocks t-2 (so "View in graph" shows); the clipboard is allowed.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const t1 = bead('t-1', { title: 'Set up CI', ready: true });
  await stubApi(page, { beads: [t1] });
  await stubBeadDetails(page, 'P', [beadDetail(t1, { dependents: [{ id: 't-2', title: 'Later', status: 'open', type: 'blocks' }] })]);
  const command = 'gin task update t-1 --claim';

  await ev.step('1. Open `/beads/P/t-1`', async () => {
    await page.goto('/beads/P/t-1');
    await expect(page.getByText('Next', { exact: true })).toBeVisible();
    await expect(page.getByText(command, { exact: true })).toBeVisible();
    const next = await page.getByRole('button', { name: 'Copy' }).boundingBox();
    const graph = await page.getByRole('link', { name: 'View in graph' }).boundingBox();
    expect(next).not.toBeNull();
    expect(graph).not.toBeNull();
    expect(next!.y).toBeLessThan(graph!.y);
  });

  await ev.step('2. Click "Copy" in the header', async () => {
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(command);
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible({ timeout: 5000 });
  });
});
