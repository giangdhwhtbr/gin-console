// TC: TC-MILESTONE-UI-060@d78ee883
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-060: Keyboard focus highlights the chain', async ({ page, ev }) => {
  // Precondition: epics A, B, C, D in M1; B depends on A, C depends on B, D has no dependency.
  await stubApi(page, {
    milestone: {
      M1: detail([
        epicPlan('A', { planned_start: '2026-11-02', planned_end: '2026-11-02' }),
        epicPlan('B', { planned_start: '2026-11-03', planned_end: '2026-11-03', depends_on: ['A'] }),
        epicPlan('C', { planned_start: '2026-11-04', planned_end: '2026-11-04', depends_on: ['B'] }),
        epicPlan('D', { planned_start: '2026-11-05', planned_end: '2026-11-05' }),
      ]),
    },
  });
  const row = (id: string) => page.getByRole('list', { name: 'Epics' }).locator(`li[data-epic="${id}"]`);
  const arrow = (from: string, to: string) => page.locator(`path[data-from="${from}"][data-to="${to}"]`);

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(row('B')).toBeVisible();
  });

  await ev.step("2. Press Tab until B's id link has focus", async () => {
    const link = row('B').getByRole('link', { name: 'B', exact: true });
    for (let i = 0; i < 40 && !(await link.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(link).toBeFocused();
    for (const id of ['A', 'B', 'C']) await expect(row(id)).not.toHaveAttribute('data-faded', /.*/);
    await expect(arrow('A', 'B')).toHaveAttribute('data-state', 'hot');
    await expect(arrow('B', 'C')).toHaveAttribute('data-state', 'hot');
    await expect(row('D')).toHaveAttribute('data-faded', 'true');
  });
});
