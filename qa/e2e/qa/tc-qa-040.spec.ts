// TC: TC-QA-040@b4d70e6a
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-040: No cases (REQ-QA-013)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: project beta whose export holds an empty cases list.
  await stubApi(page, { projects: ['alpha', 'beta', 'qwikfone'] });
  await stubQa(page, { cases: caseList([]) });

  await ev.step('1. Open `/tests?project=beta`', async () => {
    await page.goto('/tests?project=beta');
    await expect(page.getByText('No test cases yet. Write them with /gin-qa:cases.')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
