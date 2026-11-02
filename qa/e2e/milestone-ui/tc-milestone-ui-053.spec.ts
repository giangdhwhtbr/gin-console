// TC: TC-MILESTONE-UI-053@f6352523
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test.use({ viewport: { width: 390, height: 844 } });

test('TC-MILESTONE-UI-053: Long title and id cut with an ellipsis on a phone', async ({ page, ev }) => {
  const ID = 'gin-workflow-rm-process-hygiene';
  const TITLE = 'Process hygiene: consistent skills, rules that bind where it matters';
  await stubApi(page, { milestone: { M1: detail([epicPlan(ID, { title: TITLE })]) } });
  const row = page.getByRole('list', { name: 'Epics' }).getByRole('listitem').filter({ hasText: TITLE });
  // A line is cut with an ellipsis when it does not wrap, ends in an ellipsis, and its text overflows the box.
  const cut = (el: Element) => {
    const css = getComputedStyle(el);
    return { nowrap: css.whiteSpace === 'nowrap', ellipsis: css.textOverflow === 'ellipsis', overflows: el.scrollWidth > el.clientWidth, height: el.getBoundingClientRect().height, line: parseFloat(css.lineHeight) };
  };

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('list', { name: 'Epics' })).toBeVisible();
    await expect(row).toBeVisible();
    for (const line of [row.getByTitle(TITLE, { exact: true }), row.getByTitle(ID)]) {
      const c = await line.evaluate(cut);
      expect(c).toMatchObject({ nowrap: true, ellipsis: true, overflows: true });
      expect(c.height).toBeLessThanOrEqual(c.line + 1); // one line
    }
    await expect(row.getByRole('link', { name: ID })).toHaveAttribute('href', `/beads/P/${ID}`);
  });

  await ev.step("2. Hover the epic's title", async () => {
    const title = row.getByTitle(TITLE, { exact: true });
    await title.hover();
    // The full title is the native hover tooltip.
    await expect(title).toHaveAttribute('title', TITLE);
  });
});
