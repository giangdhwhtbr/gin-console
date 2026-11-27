// TC: TC-QA-037@f60c7a97
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-037: Project without gin-qa (REQ-QA-013)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: project qwikfone on a console host without gin-qa.
  await stubApi(page, { projects: ['alpha', 'beta', 'qwikfone'] });
  await stubQa(page, { cases: qaFailure('gin-qa is not installed on the console host', 'missing') });

  await ev.step('1. Open `/tests?project=qwikfone`', async () => {
    await page.goto('/tests?project=qwikfone');
    await expect(page.getByText('gin-qa is not installed on the console host')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
