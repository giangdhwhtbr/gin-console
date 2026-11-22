// TC: TC-UI-303@b17b5cb5
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-UI-303: Numbers use tabular figures', async ({ page, ev }) => {
  // Preconditions: P reports M1 with the forecast finish 1 December and M2 with the forecast finish 11 November; the window is 1440px wide.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['P'],
    milestones: list([
      entry('M1', { title: 'Alpha launch', status: 'active', start: '2026-11-02', end: '2026-12-18', finish: '2026-12-01', epics: { total: 4, closed: 1 } }),
      entry('M2', { title: 'Beta launch', status: 'planned', start: '2026-11-02', end: '2026-12-18', finish: '2026-11-11', epics: { total: 3, closed: 0 } }),
    ]),
  });
  const row = (title: string) => page.getByRole('list', { name: 'Milestones' }).getByRole('listitem').filter({ hasText: title });

  await ev.step('1. Open `/milestones?project=P`', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('list', { name: 'Milestones' }).getByRole('listitem')).toHaveCount(2);
  });

  await ev.step('2. Read the forecast of `M1`', async () => {
    await expect(row('Alpha launch').getByText('Finishes 1 Dec', { exact: true })).toBeVisible();
  });

  await ev.step('3. Read the forecast of `M2`', async () => {
    await expect(row('Beta launch').getByText('Finishes 11 Nov', { exact: true })).toBeVisible();
  });

  await ev.step('4. Read the computed `font-variant-numeric` of the elements that show numbers', async () => {
    // every element of the page whose own text holds a digit
    const numeric = await page.locator('main').evaluate((main) => {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      const seen = new Map<Element, string>();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (el && /\d/.test(n.textContent ?? '') && !seen.has(el)) seen.set(el, getComputedStyle(el).fontVariantNumeric);
      }
      return [...seen].map(([el, value]) => ({ text: (el.textContent ?? '').trim().slice(0, 40), value }));
    });
    expect(numeric.length).toBeGreaterThan(4);
    for (const { text, value } of numeric) expect(value, `font-variant-numeric of "${text}"`).toContain('tabular-nums');
  });
});
