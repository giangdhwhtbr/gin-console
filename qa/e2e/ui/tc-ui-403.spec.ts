// TC: TC-UI-403@c47bdc6b
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-403: Deferred bead only on My work (REQ-UI-150)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; the only bead assigned to ann is deferred.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, { beads: [bead('t-1', { title: 'Put off', status: 'deferred', assignee: 'ann' })] });

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    await expect(page.getByText('No work for ann@x.com')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the Beads page' })).toHaveAttribute('href', '/beads?project=P');
    await expect(page.getByRole('link', { name: /Put off/ })).toHaveCount(0);
  });
});
