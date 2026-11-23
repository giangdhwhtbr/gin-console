// TC: TC-UI-370@5f713dc2
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-370: No panel under 1024px', async ({ page, ev }) => {
  // Precondition: the Graph view of project example at 800px wide, URL has select=b.
  const beads = [bead('a', { title: 'Design', ready: true }), bead('b', { title: 'Build', blocked: true, blocked_by: ['a'], dependency_count: 1 })];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 800, height: 900 });

  await ev.step('1. Open the page', async () => {
    await page.goto('/beads?project=example&milestone=all&view=graph&select=b');
    await expect(page.locator('[data-node="b"]')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Bead details' })).toHaveCount(0);
  });
});
