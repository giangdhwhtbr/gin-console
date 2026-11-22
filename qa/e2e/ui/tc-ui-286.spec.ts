// TC: TC-UI-286@6dc5eb13
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-286: Owner is not the assignee', async ({ page, ev }) => {
  // Preconditions: t-1 owned by lead@example.com, no assignee; 1440px window.
  await page.setViewportSize({ width: 1440, height: 800 });
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('t-1', { title: 'Pay invoices', owner: 'lead@example.com', assignee: null })],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=list', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    const row = page.getByRole('treeitem').filter({ hasText: 't-1' });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('Unassigned')).toBeVisible();
    await expect(row).not.toContainText('lead@example.com');
  });
});
