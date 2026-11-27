// TC: TC-QA-032@8b765302
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-032: Run not on this host (REQ-QA-011)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: TC-UI-121 whose run folder is not on the console host.
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, { details: { 'TC-UI-121': caseDetail('TC-UI-121', { latest_run: null, latest_run_reason: 'not_on_host' }) } });

  await ev.step('1. Open `/tests/alpha/TC-UI-121`', async () => {
    await page.goto('/tests/alpha/TC-UI-121');
    const run = page.getByRole('region', { name: 'Latest run' });
    await expect(run).toContainText('Run folder is not on this host');
  });
});
