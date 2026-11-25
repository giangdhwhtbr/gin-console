// TC: TC-OVERVIEW-029@7e9939a8
// TC: TC-OVERVIEW-029@x
import { test, expect } from '../evidence';
import { epicWorkflow, overview, overviewProject, stubApi } from '../support/api';
import { lateForecast, onTrackStatus, signIn } from '../support/overview';

test('TC-OVERVIEW-029: Poll does not run gin (REQ-OVERVIEW-010)', async ({ page, ev }) => {
  // Precondition: the page is open and its gates and verdicts are loaded; the overview names the same epics and milestones.
  await signIn(page);
  await page.clock.install();
  const stub = await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { milestone: { id: 'm1', title: 'Beta readiness' }, epics: [{ id: 'e-1', title: 'Title e-1' }] })]),
    status: onTrackStatus('a'),
    milestones: lateForecast,
    workflow: epicWorkflow(),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gates not met (0)' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Beta readiness' }) })).toContainText('Late');
  });

  await ev.step('2. Wait 10 seconds', async () => {
    stub.calls.length = 0;
    await page.clock.runFor(10_000);
    await expect.poll(() => stub.calls.filter((u) => u.pathname === '/api/overview').length).toBeGreaterThanOrEqual(1);
    expect(stub.calls.filter((u) => u.pathname !== '/api/overview' && u.pathname !== '/api/projects' && u.pathname !== '/api/projects/beads')).toEqual([]);
  });
});
