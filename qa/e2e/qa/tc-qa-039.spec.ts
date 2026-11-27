// TC: TC-QA-039@2fd75793
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-039: Case page with another error (REQ-QA-013)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: the case request answers 502 with an error and no cause.
  await stubApi(page, { projects: ['alpha', 'beta', 'qwikfone'] });
  await stubQa(page, { details: { 'TC-UI-115': qaFailure('gin-qa timed out') } });

  await ev.step('1. Open `/tests/alpha/TC-UI-115`', async () => {
    await page.goto('/tests/alpha/TC-UI-115');
    await expect(page.getByText('gin-qa timed out')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Latest run' })).toHaveCount(0);
  });
});
