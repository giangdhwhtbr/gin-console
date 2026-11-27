// TC: TC-UI-419@e634f714
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-419: Image indicator tooltip (REQ-UI-132)', async ({ page, ev }) => {
  // Precondition: task t-1 of project alpha with image_count 2.
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1', { ready: true, title: 'Card title', image_count: 2 })] });

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    await expect(page.getByRole('link', { name: 'Card title' })).toBeVisible();
  });

  await ev.step('2. Rest the pointer on the image indicator 2 of the card of `t-1`', async () => {
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    const indicator = card.getByRole('img', { name: '2 images' });
    await indicator.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('screenshots of this bead the console can show');
    await expect(tooltip).toContainText('files on the console host');
    await expect(tooltip).toContainText('attachments in the shared store');
    await expect(indicator).not.toHaveAttribute('title', /.*/);
  });
});
