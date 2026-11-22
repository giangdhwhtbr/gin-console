// TC: TC-UI-277@39078bca
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProjectPulls } from '../support/pull';

test('TC-UI-277: Legend open and close', async ({ page, ev }) => {
  // Precondition: alpha has beads.
  await stubProjectPulls(
    page,
    [{ name: 'alpha', path: '/tmp/alpha', beads: { open: 1, in_progress: 0, blocked: 0, ready: 1, epics: [] } }],
    [bead('t-1', { ready: true, title: 'Card title' })],
  );

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=list`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list');
    await expect(page.getByRole('button', { name: 'Legend' })).toBeVisible();
  });

  await ev.step('2. Activate "Legend"', async () => {
    await page.getByRole('button', { name: 'Legend' }).click();
    const panel = page.getByRole('dialog', { name: 'Legend' });
    await expect(panel).toBeVisible();
    for (const word of ['Ready', 'In progress', 'Blocked', 'Done', 'Deferred']) {
      await expect(panel.getByText(word, { exact: true }).first()).toBeVisible();
    }
    await expect(panel.locator('dd').nth(2)).not.toBeEmpty();
    await expect(panel).toContainText(/blocked/i);
    await expect(panel).toContainText(/done|closed/i);
    await expect(panel).toContainText(/progress/i);
  });

  await ev.step('3. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Legend' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Legend' })).toBeFocused();
  });
});
