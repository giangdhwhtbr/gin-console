// TC: TC-BEADS-117@adc2e72a
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { fetched, stubProjectPulls } from '../support/pull';

test('TC-BEADS-117: Failed fetch note on Beads (REQ-BEADS-034)', async ({ page, ev }) => {
  // Precondition: alpha's attachments_fetch is an error "no network"; omega's is no_store.
  await stubProjectPulls(page, [
    { name: 'alpha', path: '/tmp/alpha', attachments_fetch: fetched('error', 'no network') },
    { name: 'omega', path: '/tmp/omega', attachments_fetch: fetched('no_store') },
  ], [bead('a-1', { ready: true })]);
  const note = 'Fetching attachments of alpha failed: no network. Run git fetch origin +refs/gin/attachments:refs/gin-console/attachments in /tmp/alpha.';

  await ev.step('1. Open `/beads?project=alpha`', async () => {
    await page.goto('/beads?project=alpha');
    await expect(page.getByText(note)).toHaveCount(1);
    await expect(page.getByText(/Fetching attachments of omega/)).toHaveCount(0);
    const listed = page.getByText('Title a-1').first();
    await expect(listed).toBeVisible();
    const noteBox = await page.getByText(note).boundingBox();
    const listBox = await listed.boundingBox();
    expect(listBox!.y).toBeGreaterThan(noteBox!.y);
  });

  await ev.step('2. Open `/beads?project=omega`', async () => {
    await page.goto('/beads?project=omega');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByText(/Fetching attachments/)).toHaveCount(0);
  });
});
