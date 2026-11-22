// TC: TC-BEADS-080@1545ce8c
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-BEADS-080: Shared link means the viewer', async ({ page, ev }) => {
  // Precondition: the viewer is ann@example.com; example has beads for ann, ann@example.com and bob.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@example.com'));
  await stubApi(page, {
    projects: ['example'],
    beads: [
      bead('b-ann', { assignee: 'ann' }),
      bead('b-mail', { assignee: 'ann@example.com' }),
      bead('b-bob', { assignee: 'bob' }),
    ],
  });

  await ev.step('1. Open `/beads?project=example&assignee=me`', async () => {
    await page.goto('/beads?project=example&assignee=me');
    await expect(page.getByText('b-ann').first()).toBeVisible();
    await expect(page.getByText('b-mail').first()).toBeVisible();
    await expect(page.getByText('b-bob')).toHaveCount(0);
    await page.getByRole('button', { name: /Assignee/ }).click();
    await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Me' })).toBeChecked();
  });
});
