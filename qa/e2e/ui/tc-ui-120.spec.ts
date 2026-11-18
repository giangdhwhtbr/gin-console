// TC: TC-UI-120@7684237d
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

const TITLE = ('Quarterly platform reliability and payments migration programme ' + 'with extended scope notes '.repeat(4)).slice(0, 120);

test('TC-UI-120: Cut text has a tooltip', async ({ page, ev }) => {
  // Precondition: alpha has a milestone titled with 120 characters.
  expect(TITLE).toHaveLength(120);
  await stubApi(page, {
    projects: ['alpha'],
    milestones: list([entry('M1', { title: TITLE, status: 'active' })]),
  });

  await ev.step('1. Open /milestones?project=alpha', async () => {
    await page.goto('/milestones?project=alpha');
    const row = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem');
    const cut = row.locator('span[title]').filter({ hasText: TITLE.slice(0, 20) });
    await expect(cut).toHaveCount(1);
    // The title in the list is cut short.
    const m = await cut.evaluate((el) => ({ s: el.scrollWidth, c: el.clientWidth, t: getComputedStyle(el).textOverflow }));
    expect(m.t).toBe('ellipsis');
    expect(m.s).toBeGreaterThan(m.c);
    // The full title is its `title`.
    await expect(cut).toHaveAttribute('title', TITLE);
  });
});
