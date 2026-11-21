// TC: TC-UI-243@e8aa5fc2
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { beadsOf, mainNav, manyBeads } from '../support/shell';

test('TC-UI-243: Link starts at the top (REQ-UI-127)', async ({ page, ev }) => {
  // Precondition: project a has 80 beads.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a'], beads: beadsOf({ a: manyBeads(80) }) });
  const scrollY = () => page.evaluate(() => window.scrollY);

  await ev.step('1. Open `/beads?project=a&view=list`', async () => {
    await page.goto('/beads?project=a&view=list');
    await expect(page.getByRole('link', { name: 'Bead number 1', exact: true })).toBeVisible();
  });

  await ev.step('2. Scroll the page 1,200px down', async () => {
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(scrollY).toBe(1200);
  });

  await ev.step('3. Click "Beads" in the main navigation', async () => {
    // the sidebar scrolls away with the page, so the click is dispatched without scrolling it into view
    await mainNav(page).getByRole('link', { name: 'Beads', exact: true }).dispatchEvent('click');
    await expect.poll(scrollY).toBe(0);
  });
});
