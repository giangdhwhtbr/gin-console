// TC: TC-BEADS-079@833ae29e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-BEADS-079: Me by handle or email', async ({ page, ev }) => {
  // Preconditions: the browser holds the email; example has beads for the handle, the email and another person.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'giangdhwhtbr@gmail.com'));
  await stubApi(page, {
    projects: ['example'],
    beads: [
      bead('b-1', { assignee: 'giangdhwhtbr' }),
      bead('b-2', { assignee: 'giangdhwhtbr@gmail.com' }),
      bead('b-3', { assignee: 'ann' }),
    ],
  });

  await ev.step('1. Open /beads?project=example', async () => {
    await page.goto('/beads?project=example');
    await expect(page.getByText('b-3').first()).toBeVisible();
  });

  await ev.step('2. Open the Assignee filter', async () => {
    await page.getByRole('button', { name: 'Assignee' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  await ev.step('3. Select "Me"', async () => {
    const popup = page.getByRole('dialog');
    await expect(popup.getByRole('checkbox').first()).toHaveAccessibleName('Me');
    await popup.getByRole('checkbox', { name: 'Me' }).check();
    await expect(page).toHaveURL(/assignee=me/);
    await expect(page.getByText('b-1').first()).toBeVisible();
    await expect(page.getByText('b-2').first()).toBeVisible();
    await expect(page.getByText('b-3')).toHaveCount(0);
  });
});
