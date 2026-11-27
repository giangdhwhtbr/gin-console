// TC: TC-UI-052@6c671443
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-UI-052: Relations link inside the console (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bead b-2 in project alpha has one dependency, b-1 titled First, status open.
  await stubBeadWithImages(page, 'alpha', bead('b-2'), [], {
    detail: { dependencies: [{ id: 'b-1', title: 'First', status: 'open', type: 'blocks' }] },
  });

  await ev.step('1. Open `/beads/alpha/b-2`', async () => {
    await page.goto('/beads/alpha/b-2');
    const link = page.getByRole('link', { name: 'b-1', exact: true });
    await expect(link).toHaveAttribute('href', '/beads/alpha/b-1');
    const row = page.getByRole('listitem').filter({ has: link });
    await expect(row).toContainText('First');
    await expect(row).toContainText(/open/i);
  });
});
