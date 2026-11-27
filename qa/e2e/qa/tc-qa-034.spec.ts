// TC: TC-QA-034@14c2427b
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-034: Run files cannot be read (REQ-QA-011)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: TC-UI-122 whose run is ../outside/r1.
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, { details: { 'TC-UI-122': caseDetail('TC-UI-122', { latest_run: null, latest_run_reason: 'invalid' }) } });

  await ev.step('1. Open `/tests/alpha/TC-UI-122`', async () => {
    await page.goto('/tests/alpha/TC-UI-122');
    const run = page.getByRole('region', { name: 'Latest run' });
    await expect(run).toContainText('Run files cannot be read');
  });
});
