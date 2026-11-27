// TC: TC-BEADS-118@b4ea27c5
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { fetched, stubProjectPulls } from '../support/pull';

test('TC-BEADS-118: Failed fetch note on My Tasks (REQ-BEADS-034)', async ({ page, ev }) => {
  // Precondition: alpha's attachments_fetch is an error "no network"; omega's is ok; the current project is alpha.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubProjectPulls(page, [
    { name: 'alpha', path: '/tmp/alpha', attachments_fetch: fetched('error', 'no network') },
    { name: 'omega', path: '/tmp/omega', attachments_fetch: fetched('ok') },
  ], [bead('a-1', { ready: true, assignee: 'qa@example.com' })]);
  const note = 'Fetching attachments of alpha failed: no network. Run git fetch origin +refs/gin/attachments:refs/gin-console/attachments in /tmp/alpha.';

  await ev.step('1. Open `/my-tasks?project=alpha`', async () => {
    await page.goto('/my-tasks?project=alpha');
    await expect(page.getByText(note)).toHaveCount(1);
    await expect(page.getByText(/Fetching attachments of omega/)).toHaveCount(0);
    const listed = page.getByText('Title a-1').first();
    await expect(listed).toBeVisible();
    const noteBox = await page.getByText(note).boundingBox();
    const listBox = await listed.boundingBox();
    expect(listBox!.y).toBeGreaterThan(noteBox!.y);
  });
});
