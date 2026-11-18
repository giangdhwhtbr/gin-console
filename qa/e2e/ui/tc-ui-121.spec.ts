// TC: TC-UI-121@9413a491
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const EPIC = 'ex-payments-provider-migration-and-reconciliation-2026';
const CHILD = `${EPIC}.1`;
const EPIC_TITLE = 'Migrate every checkout payment to the new provider';
const CHILD_TITLE = 'Switch the checkout call to the new provider';
const short = (id: string) => (id.length <= 24 ? id : `${id.slice(0, 14)}…${id.slice(-9)}`);

test('TC-UI-121: Long id keeps the title', async ({ page, ev }) => {
  // Precondition: alpha has the epic with an open task.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead(EPIC, { title: EPIC_TITLE, issue_type: 'epic' }),
      bead(CHILD, { title: CHILD_TITLE, parent: EPIC, ready: true }),
    ],
  });

  await ev.step('1. Set the browser window to 1440px wide', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(page.viewportSize()!.width).toBe(1440);
  });

  await ev.step(`2. Open /beads?project=alpha&milestone=all`, async () => {
    await page.goto('/beads?project=alpha&milestone=all');
    await expect(page.getByRole('button', { name: `Expand ${EPIC}` })).toBeVisible();
  });

  await ev.step('3. Click the open control of the epic', async () => {
    await page.getByRole('button', { name: `Expand ${EPIC}` }).click();
    await expect(page.getByRole('button', { name: `Collapse ${EPIC}` })).toBeVisible();
    await checkRows();
  });

  await ev.step('4. Set the browser window to 390px wide', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    expect(page.viewportSize()!.width).toBe(390);
  });

  await ev.step('5. Open /beads?project=alpha&milestone=all', async () => {
    // The app remembers the opened branches for the browser session; a fresh visit starts with the epic closed.
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/beads?project=alpha&milestone=all');
    await expect(page.getByRole('button', { name: `Expand ${EPIC}` })).toBeVisible();
  });

  await ev.step('6. Click the open control of the epic', async () => {
    await page.getByRole('button', { name: `Expand ${EPIC}` }).click();
    await expect(page.getByRole('button', { name: `Collapse ${EPIC}` })).toBeVisible();
    await checkRows();
  });

  async function checkRows() {
    for (const [id, title] of [[EPIC, EPIC_TITLE], [CHILD, CHILD_TITLE]]) {
      const row = page.locator(`[data-id="${id}"]`);
      await expect(row).toBeVisible();
      await expect(row.getByText(short(id), { exact: true })).toBeVisible();
      const link = row.getByRole('link', { name: title });
      await expect(link).toBeVisible();
      const cell = row.locator('span[title]').filter({ hasText: title });
      expect(await cell.evaluate((el) => el.clientWidth)).toBeGreaterThan(40);
    }
  }
});
