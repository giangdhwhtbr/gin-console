// TC: TC-UI-418@36c0176d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-418: Image indicator (REQ-UI-066)', async ({ page, ev }) => {
  // Precondition: task t-1 of project alpha with image_count 2.
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1', { ready: true, title: 'Card title', image_count: 2 })] });

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    const indicator = card.getByRole('img', { name: '2 images' });
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('2');
  });

  await ev.step('2. Open `/beads?project=alpha&milestone=all&view=list`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    const row = page.getByRole('tree', { name: 'Beads of alpha' }).getByRole('treeitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    const indicator = row.getByRole('img', { name: '2 images' });
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('2');
  });
});
