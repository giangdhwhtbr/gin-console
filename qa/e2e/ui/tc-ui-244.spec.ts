// TC: TC-UI-244@307f5e85
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { beadsOf, manyBeads, stubBeadPages } from '../support/shell';

test('TC-UI-244: Storage refused (REQ-UI-127)', async ({ page, ev }) => {
  // Precondition: project a has 80 beads; the browser throws when the position is stored.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('refused', 'QuotaExceededError');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const byProject = { a: manyBeads(80) };
  await stubApi(page, { projects: ['a'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);
  const scrollY = () => page.evaluate(() => window.scrollY);

  await ev.step('1. Open `/beads?project=a&view=list`', async () => {
    await page.goto('/beads?project=a&view=list');
    await expect(page.getByRole('link', { name: 'Bead number 1', exact: true })).toBeVisible();
  });

  await ev.step('2. Scroll the page 1,200px down', async () => {
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(scrollY).toBe(1200);
  });

  await ev.step('3. Open a bead from the list', async () => {
    const opened = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[role="treeitem"][data-id]'));
      const row = rows.find((r) => r.getBoundingClientRect().top > 120 && r.getBoundingClientRect().bottom < window.innerHeight - 20);
      return row?.dataset.id ?? '';
    });
    expect(opened).not.toBe('');
    await page.locator(`[role="treeitem"][data-id="${opened}"]`).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/beads/a/${opened}$`));
  });

  await ev.step('4. Use the browser Back button', async () => {
    await page.goBack();
    await expect(page.getByRole('link', { name: 'Bead number 1', exact: true })).toBeVisible();
    await expect.poll(scrollY).toBe(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
