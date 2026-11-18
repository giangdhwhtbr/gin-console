// TC: TC-UI-123@c5935510
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-123: Nothing selected', async ({ page, ev }) => {
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1', { title: 'Pay invoices' })] });

  await ev.step('1. Set the window width to 1280px', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await ev.step('2. Open /beads?project=alpha&milestone=all&view=list', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    await expect(page.getByText('Pay invoices').first()).toBeVisible();
    await expect(page).not.toHaveURL(/select=/);
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
    const tree = (await page.getByRole('tree', { name: 'Beads of alpha' }).boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;
    expect(tree.width).toBeGreaterThan(main.width * 0.9);
  });
});
