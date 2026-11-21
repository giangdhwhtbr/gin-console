// TC: TC-UI-241@60d3019a
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { beadsOf, manyBeads, stubBeadPages } from '../support/shell';

test('TC-UI-241: Back to a long list (REQ-UI-127)', async ({ page, ev }) => {
  // Precondition: project a has 80 beads, so the List view is longer than the window.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = { a: manyBeads(80) };
  await stubApi(page, { projects: ['a'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);
  const scrollY = () => page.evaluate(() => window.scrollY);
  let opened = '';

  await ev.step('1. Open `/beads?project=a&view=list`', async () => {
    await page.goto('/beads?project=a&view=list');
    await expect(page.getByRole('link', { name: 'Bead number 1', exact: true })).toBeVisible();
  });

  await ev.step('2. Scroll the page 1,200px down', async () => {
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(scrollY).toBe(1200);
  });

  await ev.step('3. Open a bead from the list', async () => {
    // a row that is fully in the window, so that opening it does not scroll the page
    opened = await page.evaluate(() => {
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
    await expect(page).toHaveURL(/\/beads\?project=a&view=list/);
    await expect.poll(scrollY).toBe(1200);
  });
});
