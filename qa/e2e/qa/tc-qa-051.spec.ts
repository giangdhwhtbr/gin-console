// TC: TC-QA-051@2f3e1f60
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseList, stubQa, stubTrends, trendsBody } from '../support/qa';

test('TC-QA-051: No test runs (REQ-QA-019)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: project beta whose export holds no run in the last 30 days.
  await stubApi(page, { projects: ['alpha', 'beta'] });
  await stubQa(page, { cases: caseList([]) });
  await stubTrends(page, trendsBody(30));

  await ev.step('1. Open `/tests?project=beta&tab=trends`', async () => {
    await page.goto('/tests?project=beta&tab=trends');
    await expect(page.getByText('No test runs in the last 30 days.')).toBeVisible();
    await expect(page.getByRole('img', { name: /^Pass rate per day/ })).toHaveCount(0);
  });
});
