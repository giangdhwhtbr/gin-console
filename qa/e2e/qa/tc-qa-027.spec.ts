// TC: TC-QA-027@f1e97be7
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';
const trio = () => [
  caseRow('TC-BEADS-001', { capability: 'beads', result: 'not run', effective_result: 'not run' }),
  caseRow('TC-UI-001', { type: 'api', result: 'passed', effective_result: 'outdated' }),
  caseRow('TC-UI-002'),
];

test('TC-QA-027: Counts and list (REQ-QA-010)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: project alpha with TC-UI-002 (passed), TC-UI-001 (outdated, last recorded passed) and TC-BEADS-001 (not run).
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, { cases: caseList(trio()) });

  await ev.step('1. Open `/tests?project=alpha`', async () => {
    await page.goto('/tests?project=alpha');
    await expect(page.getByRole('heading', { name: 'Tests', exact: true })).toBeVisible();
    const tables = page.getByRole('table');
    await expect(tables).toHaveCount(2);
    const capability = tables.nth(0).getByRole('row');
    await expect(capability.filter({ hasText: 'beads' }).getByRole('button', { name: 'beads not run: 1' })).toBeVisible();
    const ui = capability.filter({ has: page.getByRole('cell', { name: 'ui', exact: true }) });
    await expect(ui.getByRole('button', { name: 'ui passed: 1' })).toBeVisible();
    await expect(ui.getByRole('button', { name: 'ui outdated: 1' })).toBeVisible();
    await expect(ui.getByRole('cell').last()).toHaveText('2');
    const type = tables.nth(1).getByRole('row');
    await expect(type.filter({ has: page.getByRole('cell', { name: 'api', exact: true }) })).toBeVisible();
    await expect(type.filter({ has: page.getByRole('cell', { name: 'e2e', exact: true }) })).toBeVisible();
    const rows = page.getByRole('list', { name: 'Cases' }).getByRole('listitem');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).getByRole('link', { name: 'TC-BEADS-001' })).toHaveAttribute('href', '/tests/alpha/TC-BEADS-001');
    const outdated = rows.filter({ hasText: 'TC-UI-001' });
    await expect(outdated).toContainText('outdated');
    await expect(outdated).toContainText('Last recorded: passed');
    await expect(outdated).toContainText('api');
    await expect(outdated).toContainText('medium');
  });
});
