// TC: TC-OVERVIEW-019@4caa427c
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { lateForecast, onTrackStatus, signIn } from '../support/overview';

test('TC-OVERVIEW-019: No open milestone (REQ-OVERVIEW-007)', async ({ page, ev }) => {
  // Precondition: a has an open milestone; b has none.
  await signIn(page);
  const stub = await stubApi(page, {
    projects: ['a', 'b'],
    overview: overview([overviewProject('a', { milestone: { id: 'm1', title: 'Beta readiness' } }), overviewProject('b')]),
    status: onTrackStatus('a'),
    milestones: lateForecast,
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    const line = page.getByRole('listitem').filter({ hasText: 'No open milestone' });
    await expect(line).toHaveCount(1);
    await expect(line).toContainText('b');
    await expect(page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Beta readiness' }) })).toContainText('Late');
    expect(stub.calls.filter((u) => u.pathname === '/api/reports/status').map((u) => u.searchParams.get('project'))).toEqual(['a']);
  });
});
