// TC: TC-UI-325@b61eb013
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { stubBeadPages } from '../support/shell';

test('TC-UI-325: Move, select and open on the Board with the keyboard (REQ-UI-037)', async ({ page, ev }) => {
  // Precondition: the Board of project example at 1280px wide, several cards, none selected.
  await page.setViewportSize({ width: 1280, height: 900 });
  const beads = [
    bead('ex-1', { title: 'First card', ready: true }), bead('ex-2', { title: 'Second card', ready: true }),
    bead('ex-3', { title: 'Third card', status: 'in_progress' }), bead('ex-4', { title: 'Fourth card', status: 'in_progress' }),
  ];
  await stubApi(page, { projects: ['example'], beads });
  await stubBeadPages(page, { example: beads });
  await page.goto('/beads?project=example&view=board');
  const cards = page.locator('[data-card]');
  await expect(cards).toHaveCount(4);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page.locator('[data-card][aria-current="true"]')).toHaveCount(0);
  let second = '';

  await ev.step('1. Press the Right arrow key until a card has focus', async () => {
    await page.keyboard.press('ArrowRight');
    await expect(cards.first()).toBeFocused();
  });

  await ev.step('2. Press the Down arrow key', async () => {
    await page.keyboard.press('ArrowDown');
    await expect(cards.nth(1)).toBeFocused();
    second = (await cards.nth(1).getAttribute('data-id')) ?? '';
    expect(second).not.toBe('');
  });

  await ev.step('3. Press `Enter`', async () => {
    await page.keyboard.press('Enter');
    const card = page.locator(`[data-card][data-id="${second}"]`);
    await expect(card).toHaveAttribute('aria-current', 'true');
    await expect(card).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`select=${second}`));
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: new RegExp(second) }).or(panel.getByText(second).first())).toBeVisible();
  });

  await ev.step('4. Press `Enter` again', async () => {
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/beads/example/${second}$`));
  });
});
