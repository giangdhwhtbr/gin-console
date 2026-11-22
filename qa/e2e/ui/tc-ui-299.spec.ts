// TC: TC-UI-299@e8dcbe14
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadPages } from '../support/shell';
import { stubApi } from '../support/api';

test('TC-UI-299: Every type on the bead page', async ({ page, ev }) => {
  // Precondition: P reports a feature p-f titled "A feature".
  const feature = bead('p-f', { title: 'A feature', issue_type: 'feature', ready: true });
  await stubApi(page, { projects: ['P'], beads: [feature] });
  await stubBeadPages(page, { P: [feature] });

  await ev.step('1. Open `/beads/P/p-f`', async () => {
    await page.goto('/beads/P/p-f');
    await expect(page.getByRole('heading', { name: 'A feature', level: 1 })).toBeVisible();
  });

  await ev.step('2. Read the line of facts of the bead page', async () => {
    const type = page.locator('div:has(> dt:text-is("Type")) > dd');
    await expect(type).toHaveText('feature');
    await expect(type).toHaveCSS('border-top-width', '0px');
    await expect(type).toHaveCSS('border-left-width', '0px');
    await expect(type).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(type.locator('*')).toHaveCount(0); // plain text, no badge element
  });
});
