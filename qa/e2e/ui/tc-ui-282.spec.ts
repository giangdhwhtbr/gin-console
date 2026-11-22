// TC: TC-UI-282@8afe949d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-282: Email assignee shows the person', async ({ page, ev }) => {
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1', { title: 'Pay invoices', assignee: 'ann@example.com' })] });
  const row = page.getByRole('treeitem').filter({ hasText: 'Pay invoices' });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=list', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    await expect(row).toBeVisible();
    await expect(row.getByText('ann', { exact: true })).toBeVisible();
    await expect(row).not.toContainText('ann@example.com');
  });

  await ev.step('2. Rest the pointer on the assignee of t-1', async () => {
    await row.getByText('ann', { exact: true }).hover();
    await expect(page.getByRole('tooltip')).toHaveText('ann@example.com');
  });
});
