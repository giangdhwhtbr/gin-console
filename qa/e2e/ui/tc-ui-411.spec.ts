// TC: TC-UI-411@a0b13874
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-411: Short label (REQ-UI-055)', async ({ page, ev }, testInfo) => {
  // Precondition: project a is configured.
  await stubApi(page, { projects: ['a'] });
  // For every link of the "Main" navigation: the visible text (not the screen-reader part) and how far it
  // reaches beyond the link's box, whether an ancestor with hidden overflow clips it, and whether it overlaps another link.
  const measure = () =>
    mainNav(page).getByRole('link').evaluateAll((links) => {
      const rects = links.map((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const shown: Text[] = [];
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if (node instanceof Text && !node.parentElement?.closest('.sr-only') && node.parentElement?.getClientRects().length && node.textContent?.trim()) shown.push(node);
        }
        const range = new Range();
        range.setStart(shown[0], 0);
        range.setEnd(shown[shown.length - 1], shown[shown.length - 1].length);
        return range.getBoundingClientRect();
      });
      const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      return links.map((el, i) => {
        const box = el.getBoundingClientRect();
        const t = rects[i];
        const overhang = Math.max(0, box.left - t.left, t.right - box.right, box.top - t.top, t.bottom - box.bottom);
        // an element from the link up to the body whose overflow is not visible and whose box does not hold the text clips it
        let clipped = false;
        for (let up: Element | null = el; up !== null && up !== document.documentElement; up = up.parentElement) {
          const style = getComputedStyle(up);
          const r = up.getBoundingClientRect();
          const hides = [style.overflowX, style.overflowY].some((v) => v !== 'visible');
          if (hides && (t.left < r.left - 0.5 || t.right > r.right + 0.5 || t.top < r.top - 0.5 || t.bottom > r.bottom + 0.5)) clipped = true;
        }
        const inViewport = t.left >= 0 && t.right <= window.innerWidth && t.top >= 0 && t.bottom <= window.innerHeight;
        const touches = rects.some((other, j) => j !== i && overlap(t, other)) || links.some((o, j) => j !== i && overlap(box, o.getBoundingClientRect()));
        return { name: el.getAttribute('href') ?? '', text: `${t.left.toFixed(1)}..${t.right.toFixed(1)} in ${box.left.toFixed(1)}..${box.right.toFixed(1)}`, overhang: Math.round(overhang * 10) / 10, clipped, inViewport, touches };
      });
    });

  for (const [n, width] of [[1, 390], [2, 820]] as const) {
    await ev.step(`${n}. Set the window to ${width}px wide${n === 1 ? ' and open \`/my-tasks?project=a\`' : ''}`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/my-tasks?project=a'); // a fresh load at each width: the shell lays out from the width it starts at
      const link = mainNav(page).getByRole('link', { name: 'REQs (Requirements)', exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveText(/^REQs/);
      const all = await measure();
      expect(all).toHaveLength(6);
      // measured overhang of each label beyond its own box, kept in the run's annotations (the pre-existing "Milestones" overhangs by about 2px in the rail)
      testInfo.annotations.push({ type: `overhang ${width}px`, description: all.map((m) => `${m.name}=${m.overhang} (${m.text})`).join(' ') });
      for (const m of all) {
        expect(m.clipped, `${m.name} is clipped at ${width}px`).toBe(false);
        expect(m.inViewport, `${m.name} leaves the window at ${width}px`).toBe(true);
        expect(m.touches, `${m.name} overlaps another link at ${width}px`).toBe(false);
        expect(m.overhang, `${m.name} overhangs its box by ${m.overhang}px at ${width}px`).toBeLessThanOrEqual(3);
      }
      // the new label itself stays inside its own box
      expect(all.find((m) => m.name.startsWith('/requirements'))?.overhang).toBeLessThanOrEqual(1);
    });
  }

  await ev.step('3. Set the window to 1440px wide', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(mainNav(page).getByRole('link', { name: 'Requirements', exact: true })).toBeVisible();
    await expect(mainNav(page).getByRole('link', { name: 'REQs (Requirements)', exact: true })).toHaveCount(0);
  });
});
