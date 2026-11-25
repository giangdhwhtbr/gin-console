// TC: TC-UI-405@a0b13874
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import {  } from '../support/requirements';
import { mainNav } from '../support/shell';

test('TC-UI-405: Short label (REQ-UI-055)', async ({ page, ev }) => {
  // Precondition: project a is configured.
  await stubApi(page, { projects: ['a'] });
  // The Requirements link keeps its visible text (not the screen-reader part) inside itself, nothing is cut off,
  // and no link of the "Main" navigation overlaps another.
  const fits = () =>
    mainNav(page).getByRole('link').evaluateAll((links) => {
      const boxes = links.map((el) => el.getBoundingClientRect());
      const requirements = links.findIndex((el) => el.getAttribute('href')?.startsWith('/requirements'));
      const walker = document.createTreeWalker(links[requirements], NodeFilter.SHOW_TEXT);
      const shown: Text[] = [];
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        if (node instanceof Text && !node.parentElement?.closest('.sr-only') && node.parentElement?.getClientRects().length && node.textContent?.trim()) shown.push(node);
      }
      const text = new Range();
      text.setStart(shown[0], 0);
      text.setEnd(shown[shown.length - 1], shown[shown.length - 1].length);
      const t = text.getBoundingClientRect();
      const b = boxes[requirements];
      const inside = t.left >= b.left - 1 && t.right <= b.right + 1 && t.top >= b.top - 1 && t.bottom <= b.bottom + 1;
      const apart = boxes.every((x, i) => boxes.every((y, j) => i >= j || x.right <= y.left + 1 || y.right <= x.left + 1 || x.bottom <= y.top + 1 || y.bottom <= x.top + 1));
      return { inside, apart, cut: links[requirements].scrollWidth > links[requirements].clientWidth + 1 };
    });

  for (const [n, width] of [[1, 390], [2, 820]] as const) {
    await ev.step(`${n}. Set the window to ${width}px wide${n === 1 ? ' and open `/my-tasks?project=a`' : ''}`, async () => {
      await page.setViewportSize({ width, height: 900 });
      if (n === 1) await page.goto('/my-tasks?project=a');
      const link = mainNav(page).getByRole('link', { name: 'REQs (Requirements)', exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveText(/^REQs/);
      expect(await fits()).toEqual({ inside: true, apart: true, cut: false });
    });
  }

  await ev.step('3. Set the window to 1440px wide', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(mainNav(page).getByRole('link', { name: 'Requirements', exact: true })).toBeVisible();
    await expect(mainNav(page).getByRole('link', { name: 'REQs (Requirements)', exact: true })).toHaveCount(0);
  });
});
