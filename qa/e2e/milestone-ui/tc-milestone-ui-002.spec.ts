// TC: TC-MILESTONE-UI-002@5b22e910
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-002: Kickoff date shown when set', async ({ page, ev }) => {
  // Precondition: P reports planned M2 with kickoff 2026-11-16.
  await stubApi(page, {
    milestones: list([
      entry('M2', { title: 'Beta launch', status: 'planned', start: '2026-11-16', end: '2026-11-27', kickoff: '2026-11-16' }),
    ]),
  });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    const m2 = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem').filter({ hasText: 'Beta launch' });
    await expect(m2).toContainText('Kicks off 16 Nov');
    await expect(m2).toContainText('16 Nov – 27 Nov');
  });
});
