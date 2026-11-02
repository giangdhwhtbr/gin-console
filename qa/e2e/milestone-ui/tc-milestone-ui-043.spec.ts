// TC: TC-MILESTONE-UI-043@bf245f0f
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-043: Unknown zoom falls back to whole milestone', async ({ page, ev }) => {
  // Precondition: milestone M1.
  await stubApi(page, { milestone: { M1: detail([epicPlan('E1', { title: 'Epic one' })]) } });
  const schedule = page.getByRole('figure', { name: 'Schedule' });

  await ev.step('1. Open /milestones/P/M1?zoom=3w', async () => {
    await page.goto('/milestones/P/M1?zoom=3w');
    const zoom = schedule.getByRole('group', { name: 'Zoom' });
    await expect(zoom.getByRole('button', { name: 'Whole milestone' })).toHaveAttribute('aria-pressed', 'true');
    await expect(zoom.getByRole('button', { name: '1 week' })).toHaveAttribute('aria-pressed', 'false');
    await expect(zoom.getByRole('button', { name: '2 weeks' })).toHaveAttribute('aria-pressed', 'false');
  });
});
