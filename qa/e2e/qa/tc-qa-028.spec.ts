// TC: TC-QA-028@bc6a2f0a
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';
const trio = () => [
  caseRow('TC-BEADS-001', { capability: 'beads', result: 'not run', effective_result: 'not run' }),
  caseRow('TC-UI-001', { type: 'api', result: 'passed', effective_result: 'outdated' }),
  caseRow('TC-UI-002'),
];

test('TC-QA-028: Count as filter (REQ-QA-010)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: the Tests page of alpha of TC-QA-027.
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, { cases: caseList(trio()) });

  await ev.step('1. Open `/tests?project=alpha`', async () => {
    await page.goto('/tests?project=alpha');
    await expect(page.getByRole('list', { name: 'Cases' }).getByRole('listitem')).toHaveCount(3);
  });

  await ev.step('2. Activate the `outdated` count of `ui`', async () => {
    await page.getByRole('button', { name: 'ui outdated: 1' }).click();
    await expect(page).toHaveURL(/[?&]capability=ui(&|$)/);
    await expect(page).toHaveURL(/[?&]result=outdated(&|$)/);
    const rows = page.getByRole('list', { name: 'Cases' }).getByRole('listitem');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('TC-UI-001');
  });
});
