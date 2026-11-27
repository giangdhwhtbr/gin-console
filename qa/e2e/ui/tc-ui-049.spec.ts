// TC: TC-UI-049@db17b19f
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-UI-049: Markdown description (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bead b-1 in project alpha has the description `## Change`, `1. Format **dates**` and a fenced code block.
  await stubBeadWithImages(page, 'alpha', bead('b-1'), [], { description: '## Change\n\n1. Format **dates**\n\n```\nnpm test\n```' });

  await ev.step('1. Open `/beads/alpha/b-1`', async () => {
    await page.goto('/beads/alpha/b-1');
    const description = page.locator('.markdown');
    await expect(description.getByRole('heading', { name: 'Change' })).toBeVisible();
    await expect(description.getByRole('listitem').filter({ hasText: 'Format dates' }).locator('strong')).toHaveText('dates');
    await expect(description.locator('ol')).toHaveCount(1);
    await expect(description.locator('pre')).toContainText('npm test');
  });
});
