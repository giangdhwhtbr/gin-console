// TC: TC-QA-049@5359337e
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseList, lastDays, stubQa, stubTrends, trendsBody } from '../support/qa';

test('TC-QA-049: Open the Trends tab (REQ-QA-018)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: project alpha with the trends of REQ-QA-015 to REQ-QA-017.
  const days = lastDays(30);
  const [d1, d2, d3] = days.slice(-3);
  const points = days.map((date) => {
    if (date === d1) return { date, passed: 3, failed: 1, rate: 0.75 };
    if (date === d3) return { date, passed: 2, failed: 0, rate: 1 };
    return { date, passed: 0, failed: 0, rate: null };
  });
  expect(d2).toBeDefined();
  await stubApi(page, { projects: ['alpha', 'beta'] });
  await stubQa(page, { cases: caseList([]) });
  await stubTrends(page, trendsBody(30, {
    days,
    pass_rate: [{ name: 'ui', points }],
    flaky: [{ case: 'TC-UI-001', capability: 'ui', flips: 2, last_result: 'passed', last_at: `${d3}T10:00:00Z` }],
    time_to_fix: { overall: { fixes: 2, median_seconds: 6300 }, by_capability: [{ name: 'ui', fixes: 2, median_seconds: 6300 }] },
    still_failing: [{ case: 'TC-BEADS-001', capability: 'beads', failing_since: `${d3}T12:00:00Z`, bug: 'gin-console-3kd' }],
  }));

  await ev.step('1. Open `/tests?project=alpha&tab=trends`', async () => {
    await page.goto('/tests?project=alpha&tab=trends');
    await expect(page.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('img', { name: /^Pass rate per day by capability/ })).toBeVisible();
    const chart = page.getByRole('img', { name: /^Pass rate per day by capability/ });
    await expect(chart.locator('.recharts-line')).toHaveCount(1);
    await expect(chart.locator('.recharts-legend-item-text')).toHaveText('ui');
    await expect(page.getByRole('link', { name: 'TC-UI-001' })).toHaveAttribute('href', '/tests/alpha/TC-UI-001');
    await expect(page.getByText('1 h 45 min').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'gin-console-3kd' })).toHaveAttribute('href', '/beads/alpha/gin-console-3kd');
  });
});
