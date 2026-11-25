// TC: TC-OVERVIEW-017@0f17ce64
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { lateForecast, onTrackStatus, signIn } from '../support/overview';

test('TC-OVERVIEW-017: Forecast changes the word (REQ-OVERVIEW-007)', async ({ page, ev }) => {
  // Precondition: a has the open milestone m1, on track without a forecast; the forecast answers after the end of m1 once released.
  await signIn(page);
  await stubApi(page, {
    projects: ['a'],
    overview: overview([overviewProject('a', { milestone: { id: 'm1', title: 'Beta readiness' } })]),
    status: onTrackStatus('a'),
  });
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route((url) => url.pathname === '/api/milestones', async (route) => {
    await held;
    await route.fulfill({ json: lateForecast });
  });
  const line = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Beta readiness' }) });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(line).toContainText('On track');
    await expect(line).toContainText('Checking forecast');
  });

  await ev.step('2. Wait for the forecast', async () => {
    release();
    await expect(line).toContainText('Late');
    await expect(line).not.toContainText('On track');
    await expect(line).not.toContainText('Checking forecast');
  });
});
