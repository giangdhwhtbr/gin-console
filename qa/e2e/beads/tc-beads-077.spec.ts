// TC: TC-BEADS-077@35f80170
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-BEADS-077: Email and handle are one person in the Assignee filter', async ({ page, ev }) => {
  // Precondition: example has beads assigned to a handle, the same person's email, and another person's email.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    projects: ['example'],
    beads: [
      bead('b-1', { assignee: 'giangdhwhtbr' }),
      bead('b-2', { assignee: 'GiangDHWHTBR@gmail.com' }),
      bead('b-3', { assignee: 'ann@example.com' }),
    ],
  });

  await ev.step('1. Open /beads?project=example', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByText('b-1').first()).toBeVisible();
  });

  await ev.step('2. Open the Assignee filter', async () => {
    await page.getByRole('button', { name: 'Assignee' }).click();
    const popup = page.getByRole('dialog');
    await expect(popup.getByText('ann', { exact: true })).toHaveCount(1);
    await expect(popup.getByText('giangdhwhtbr', { exact: true })).toHaveCount(1);
    await expect(popup.getByText('GiangDHWHTBR@gmail.com')).toHaveCount(0);
    await expect(popup.getByText('ann@example.com')).toHaveCount(0);
  });
});
