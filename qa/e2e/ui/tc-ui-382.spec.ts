// TC: TC-UI-382@118f537c
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-382: Prep task and epic left out of My work (REQ-UI-150)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; a prep bead, a prep and track:2 bead and an epic, all ready without an assignee.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, {
    beads: [
      bead('t-1', { title: 'Prep only', ready: true, labels: ['prep'] }),
      bead('t-2', { title: 'Prep of a track', ready: true, labels: ['prep', 'track:2'] }),
      bead('e-1', { title: 'An epic', ready: true, issue_type: 'epic' }),
    ],
  });

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    const unclaimed = page.getByRole('heading', { name: /^Unclaimed\b/ }).locator('xpath=..');
    await expect(unclaimed.getByRole('link', { name: /Prep of a track/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Prep only/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /An epic/ })).toHaveCount(0);
  });
});
