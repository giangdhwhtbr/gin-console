// TC: TC-UI-372@f3b2c844
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-372: Selected Graph node', async ({ page, ev }) => {
  // Precondition: the Graph view at 1440px wide with select=b.
  const beads = [bead('a', { title: 'Design', ready: true }), bead('b', { title: 'Build', blocked: true, blocked_by: ['a'], dependency_count: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&milestone=all&view=graph&select=b');
    const node = page.locator('[data-node="b"]');
    await expect(node).toBeVisible();
    await expect(node).toHaveClass(/bg-identity-wash/);
    await expect(page.locator('[data-node="a"]')).not.toHaveClass(/bg-identity-wash/);
    const shadow = await node.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).toMatch(/inset/);
    expect(shadow).toMatch(/inset 3px 0px 0px 0px|3px 0px 0px 0px inset/);
    await expect(page.getByRole('complementary', { name: 'Bead details' }).getByRole('heading', { name: 'Build' })).toBeVisible();
  });
});
