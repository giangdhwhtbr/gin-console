// TC: TC-UI-365@ba5f6217
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';

test('TC-UI-365: Open and close control does not select', async ({ page, ev }) => {
  // Precondition: the List view at 1280px wide with epic e-1 closed and nothing selected.
  const beads = [
    bead('e-1', { title: 'Epic one', issue_type: 'epic' }),
    bead('e-1.1', { title: 'Child task', parent: 'e-1', ready: true }),
  ];
  await stubApi(page, { projects: ['example'], beads });
  await stubDetails(page, beads, 'example');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/beads?project=example&milestone=all&view=list');
  const row = page.getByRole('treeitem', { name: /^(Expand|Collapse) e-1 / });
  await expect(row).toHaveAttribute('aria-expanded', 'false');

  await ev.step('1. Click the open/close control of e-1', async () => {
    await page.getByRole('button', { name: 'Expand e-1' }).click();
    await expect(row).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('treeitem', { name: /^e-1\.1 / })).toBeVisible();
    await expect(page).not.toHaveURL(/select=/);
  });
});
