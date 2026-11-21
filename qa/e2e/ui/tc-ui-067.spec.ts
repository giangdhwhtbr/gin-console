// TC: TC-UI-067@2c65dee1
import { test, expect } from '../evidence';
import { arrowsOf, epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-067: Epic (REQ-UI-075)', async ({ page, ev }) => {
  // Precondition: epic e-1 in alpha has tasks a and b, and b is blocked by a.
  await stubProject(page, 'alpha', [epicOf('e-1'), taskOf('a', 'e-1'), taskOf('b', 'e-1', ['a'])]);

  await ev.step('1. Open `/beads/alpha/e-1/graph`', async () => {
    await page.goto('/beads/alpha/e-1/graph');
    await expect(page).toHaveURL(/\/beads\/alpha\/e-1\?tab=graph$/);
    await expect(page.getByRole('tab', { name: 'Graph' })).toHaveAttribute('aria-selected', 'true');
    await expect(nodeOf(page, 'a')).toBeVisible();
    await expect(nodeOf(page, 'b')).toBeVisible();
    await expect(arrowsOf(page)).toHaveText(['b is blocked by a']);
  });
});
