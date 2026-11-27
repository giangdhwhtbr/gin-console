// TC: TC-UI-050@915c363e
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test('TC-UI-050: Raw HTML stays text (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bead b-1 in project alpha has a description with `<script>x</script>` and `<img src=x onerror=alert(1)>`.
  await stubBeadWithImages(page, 'alpha', bead('b-1'), [], { description: '<script>x</script>\n\n<img src=x onerror=alert(1)>' });

  await ev.step('1. Open `/beads/alpha/b-1`', async () => {
    await page.goto('/beads/alpha/b-1');
    const description = page.locator('.markdown');
    await expect(description).toContainText('<script>x</script>');
    await expect(description).toContainText('<img src=x onerror=alert(1)>');
    await expect(description.locator('script')).toHaveCount(0);
    await expect(description.locator('img')).toHaveCount(0);
  });
});
