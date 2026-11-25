// TC: TC-OVERVIEW-018@6a90efee
import { test, expect } from '../evidence';
import { failure, overview, overviewProject, stubApi } from '../support/api';
import { onTrackStatus, signIn } from '../support/overview';

test('TC-OVERVIEW-018: Forecast fails (REQ-OVERVIEW-007)', async ({ page, ev }) => {
  // Precondition: a has the open milestone m1; GET /api/milestones answers 502.
  await signIn(page);
  await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { milestone: { id: 'm1', title: 'Beta readiness' } })]),
    status: onTrackStatus('a'),
    milestones: failure('forecast is down'),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    const line = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Beta readiness' }) });
    await expect(line).toContainText('On track');
    await expect(line).toContainText('Forecast not loaded');
  });
});
