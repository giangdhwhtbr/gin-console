// TC: TC-UI-298@357f0d5b
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-298: Only bugs show a type on rows', async ({ page, ev }) => {
  // Precondition: P reports an epic p-e, a bug p-b, a feature p-f and a task p-t. Light theme: carnelian is #B42318.
  await page.emulateMedia({ colorScheme: 'light' });
  await stubApi(page, {
    projects: ['P'],
    beads: [
      bead('p-e', { title: 'Epic work', issue_type: 'epic' }),
      bead('p-b', { title: 'Bug work', issue_type: 'bug', ready: true }),
      bead('p-f', { title: 'Feature work', issue_type: 'feature', ready: true }),
      bead('p-t', { title: 'Task work', issue_type: 'task', ready: true }),
    ],
  });
  const row = (id: string) => page.locator(`[role="treeitem"][data-id="${id}"]`);

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('treeitem')).toHaveCount(4);
  });

  await ev.step('2. Read the row of each of the four beads', async () => {
    // only the bug shows a type: the word "bug" in carnelian, without border or background
    const bug = row('p-b').locator('[data-type="bug"]');
    await expect(bug).toHaveText('bug');
    await expect(bug).toHaveCSS('color', 'rgb(180, 35, 24)');
    await expect(bug).toHaveCSS('border-top-width', '0px');
    await expect(bug).toHaveCSS('border-left-width', '0px');
    await expect(bug).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    for (const id of ['p-e', 'p-f', 'p-t']) {
      await expect(row(id)).toBeVisible();
      await expect(row(id).locator('[data-type]')).toHaveCount(0);
      for (const word of ['epic', 'feature', 'task']) await expect(row(id).getByText(word, { exact: true })).toHaveCount(0);
    }
    // no row contains a pill: no inner element with a border or a background of its own
    const pills = await page.locator('[role="treeitem"]').evaluateAll((rows) =>
      rows.flatMap((r) =>
        [...r.querySelectorAll('*')].filter((el) => {
          if (el instanceof SVGElement) return false;
          const s = getComputedStyle(el);
          const border = ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && s.getPropertyValue(`border-${side.toLowerCase()}-style`) !== 'none');
          return border || s.backgroundColor !== 'rgba(0, 0, 0, 0)';
        }).map((el) => el.outerHTML.slice(0, 120)),
      ),
    );
    expect(pills).toEqual([]);
  });
});
