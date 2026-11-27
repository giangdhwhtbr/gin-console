// TC: TC-QA-038@f471ab52
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-038: Old gin-qa on the Tests page (REQ-QA-013)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: a gin-qa whose export has no effective_result.
  await stubApi(page, { projects: ['alpha', 'beta', 'qwikfone'] });
  await stubQa(page, { cases: qaFailure('this gin-qa has no effective_result', 'outdated') });

  await ev.step('1. Open `/tests?project=alpha`', async () => {
    await page.goto('/tests?project=alpha');
    await expect(page.getByText('This gin-qa is too old; run gin-workflow/install.sh --plugin gin-qa')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
