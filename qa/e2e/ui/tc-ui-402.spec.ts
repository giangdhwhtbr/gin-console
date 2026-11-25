// TC: TC-UI-402@7926097c
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-402: Empty group of My work (REQ-UI-150)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; one ready bead assigned to ann and no other bead of hers.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, { beads: [bead('t-1', { title: 'Mine ready', ready: true, assignee: 'ann' })] });

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    const mine = page.getByRole('heading', { name: /^Assigned to me\b/ }).locator('xpath=..');
    await expect(mine.getByRole('link', { name: /Mine ready/ })).toBeVisible();
    const active = page.getByRole('heading', { name: /^In progress\b/ }).locator('xpath=..');
    await expect(active.getByText('Nothing here')).toBeVisible();
  });
});
