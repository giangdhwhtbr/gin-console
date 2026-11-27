// TC: TC-QA-029@207d219a
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-029: Failed with bug (REQ-QA-010)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: TC-UI-115 failed with bug gin-console-3kd; TC-UI-116 passed with bug gin-console-4aa.
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, {
    cases: caseList([
      caseRow('TC-UI-115', { result: 'failed', effective_result: 'failed', bug: 'gin-console-3kd' }),
      caseRow('TC-UI-116', { bug: 'gin-console-4aa' }),
    ]),
  });

  await ev.step('1. Open `/tests?project=alpha`', async () => {
    await page.goto('/tests?project=alpha');
    await expect(page.getByRole('list', { name: 'Cases' }).getByRole('listitem')).toHaveCount(2);
  });

  await ev.step('2. Choose the result "Failed" in the filters', async () => {
    await page.getByLabel('Result').selectOption('failed');
    await expect(page).toHaveURL(/[?&]result=failed(&|$)/);
    const rows = page.getByRole('list', { name: 'Cases' }).getByRole('listitem');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().getByRole('link', { name: 'gin-console-3kd' })).toHaveAttribute('href', '/beads/alpha/gin-console-3kd');
    await expect(page.getByText('TC-UI-116')).toHaveCount(0);
  });
});
