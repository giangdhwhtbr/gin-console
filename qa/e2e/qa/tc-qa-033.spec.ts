// TC: TC-QA-033@658e477f
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-033: No run recorded (REQ-QA-011)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: TC-UI-120 with an empty run.
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, { details: { 'TC-UI-120': caseDetail('TC-UI-120', { latest_run: null, latest_run_reason: 'no_run' }) } });

  await ev.step('1. Open `/tests/alpha/TC-UI-120`', async () => {
    await page.goto('/tests/alpha/TC-UI-120');
    const run = page.getByRole('region', { name: 'Latest run' });
    await expect(run).toContainText('No run recorded');
  });
});
