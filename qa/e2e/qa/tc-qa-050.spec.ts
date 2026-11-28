// TC: TC-QA-050@5598f756
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseList, lastDays, stubQa, stubTrends, trendsBody } from '../support/qa';

test('TC-QA-050: Change the window (REQ-QA-018)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: the Trends tab of alpha.
  await stubApi(page, { projects: ['alpha', 'beta'] });
  await stubQa(page, { cases: caseList([]) });
  const trends = await stubTrends(page, (url) => {
    const days = Number(url.searchParams.get('days') ?? '30');
    return trendsBody(days, {
      pass_rate: [{ name: 'ui', points: lastDays(days).map((date) => ({ date, passed: 1, failed: 0, rate: 1 })) }],
    });
  });

  await ev.step('1. Open `/tests?project=alpha&tab=trends`', async () => {
    await page.goto('/tests?project=alpha&tab=trends');
    await expect(page.getByRole('img', { name: /^Pass rate per day by capability/ })).toBeVisible();
  });

  await ev.step('2. Pick 7 days', async () => {
    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page).toHaveURL(/days=7/);
  });

  await ev.step('3. Pick the capability `ui`', async () => {
    await page.getByRole('combobox', { name: 'Capability' }).selectOption('ui');
    await expect(page).toHaveURL(/capability=ui/);
    await expect.poll(() => trends.calls.some((u) => u.searchParams.get('days') === '7' && u.searchParams.get('capability') === 'ui')).toBe(true);
    const url = new URL(page.url());
    expect(url.searchParams.get('tab')).toBe('trends');
    expect(url.searchParams.get('days')).toBe('7');
    expect(url.searchParams.get('capability')).toBe('ui');
  });
});
