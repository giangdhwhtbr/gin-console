// TC: TC-MILESTONE-UI-053@af5d7038
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test.use({ viewport: { width: 390, height: 844 } });

test('TC-MILESTONE-UI-053: Long title cut with an ellipsis, id and period wrap on a phone', async ({ page, ev }) => {
  const ID = 'gin-workflow-rm-process-hygiene';
  const TITLE = 'Process hygiene: consistent skills, rules that bind where it matters';
  // The epic has a closed and an open track, so its row shows "1/2 closed".
  await stubApi(page, {
    milestone: { M1: detail([epicPlan(ID, { title: TITLE })]) },
    beads: [
      bead(ID, { title: TITLE, issue_type: 'epic' }),
      bead('t-1', { issue_type: 'task', parent: ID, status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
      bead('t-2', { issue_type: 'task', parent: ID }),
    ],
  });
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
    // The title takes one line, cut short with an ellipsis.
    const c = await row.getByTitle(TITLE, { exact: true }).evaluate(cut);
    expect(c).toMatchObject({ nowrap: true, ellipsis: true, overflows: true });
    expect(c.height).toBeLessThanOrEqual(c.line + 1);
    // The id, the period and the closed tracks wrap onto the following lines, none of them cut.
    const title = await row.getByTitle(TITLE, { exact: true }).boundingBox();
    const id = await row.getByTitle(ID).boundingBox();
    const period = await row.getByTitle(/, 3d$/).boundingBox();
    const closed = await row.getByTitle('1/2 closed', { exact: true }).boundingBox();
    if (!title || !id || !period || !closed) throw new Error('a line of the epic row has no box');
    expect(id.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(period.y).toBeGreaterThanOrEqual(id.y + id.height - 1);
    expect(closed.y).toBeGreaterThanOrEqual(period.y + period.height - 1);
    // The period and the closed tracks are whole; the id may be cut but keeps at least 64 px, so its link stays reachable.
    for (const line of [row.getByTitle(/, 3d$/), row.getByTitle('1/2 closed', { exact: true })]) {
      expect(await line.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    expect(id.width).toBeGreaterThanOrEqual(64);
    await expect(row.getByRole('link', { name: ID })).toHaveAttribute('href', `/beads/P/${ID}`);
  });

  await ev.step("2. Hover the epic's title", async () => {
    const title = row.getByTitle(TITLE, { exact: true });
    await title.hover();
    // The full title is the native hover tooltip.
    await expect(title).toHaveAttribute('title', TITLE);
  });
});
