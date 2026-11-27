// TC: TC-UI-414@db1b2a3f
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-UI-414: External image is a link (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bead b-1 of project alpha whose description holds `![chart](https://example.com/x.png)` and `![key](attachment:ab12)`.
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).hostname));
  await stubBeadWithImages(page, 'alpha', bead('b-1'), [], {
    description: '![chart](https://example.com/x.png)\n\n![key](attachment:ab12)',
  });

  await ev.step('1. Open `/beads/alpha/b-1`', async () => {
    await page.goto('/beads/alpha/b-1');
    const description = page.locator('.markdown');
    const link = description.getByRole('link', { name: 'Image: chart (example.com)' });
    await expect(link).toHaveAttribute('href', 'https://example.com/x.png');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noreferrer');
    await expect(description.getByText('key', { exact: true })).toBeVisible();
    await expect(description.locator('img')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(requested.filter((host) => host.endsWith('example.com'))).toEqual([]);
  });
});
