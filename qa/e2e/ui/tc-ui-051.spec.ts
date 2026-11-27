// TC: TC-UI-051@9aaf2199
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-UI-051: Unsafe link (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bead b-1 in project alpha has a description with `[run](javascript:alert(1))` and `[docs](https://example.com)`.
  await stubBeadWithImages(page, 'alpha', bead('b-1'), [], { description: '[run](javascript:alert(1)) and [docs](https://example.com)' });

  await ev.step('1. Open `/beads/alpha/b-1`', async () => {
    await page.goto('/beads/alpha/b-1');
    const description = page.locator('.markdown');
    await expect(description.getByText('run', { exact: true })).toBeVisible();
    await expect(description.getByRole('link', { name: 'run' })).toHaveCount(0);
    const docs = description.getByRole('link', { name: 'docs' });
    await expect(docs).toHaveAttribute('href', 'https://example.com');
    await expect(docs).toHaveAttribute('target', '_blank');
    await expect(docs).toHaveAttribute('rel', 'noreferrer');
  });
});
