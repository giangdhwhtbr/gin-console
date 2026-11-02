// TC: TC-MILESTONE-UI-012@cee36bc5
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-012: Kick-start date defaults to kickoff, else start', async ({ page, ev }) => {
  // Precondition: planned M1 kicks off 2026-11-16 (start 2026-11-09); scheduled M2 has no kickoff and starts 2026-11-23.
  await stubApi(page, {
    milestone: {
      M1: detail([epicPlan('A', { title: 'Epic A', planned_start: '2026-11-16', planned_end: '2026-11-18' })], {
        id: 'M1', title: 'Alpha launch', status: 'planned', kickoff: '2026-11-16', start: '2026-11-09', end: '2026-11-27',
        schedule_start: '2026-11-16', finish: '2026-11-18',
      }),
      M2: detail([epicPlan('B', { title: 'Epic B', planned_start: '2026-11-23', planned_end: '2026-11-25' })], {
        id: 'M2', title: 'Beta launch', status: 'scheduled', kickoff: null, start: '2026-11-23', end: '2026-12-04',
        schedule_start: '2026-11-23', finish: '2026-11-25',
      }),
    },
  });

  await ev.step('1. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('heading', { name: 'Alpha launch' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Kick-start date' })).toHaveValue('2026-11-16');
  });

  await ev.step('2. Open /milestones/P/M2', async () => {
    await page.goto('/milestones/P/M2');
    await expect(page.getByRole('heading', { name: 'Beta launch' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Kick-start date' })).toHaveValue('2026-11-23');
  });
});
