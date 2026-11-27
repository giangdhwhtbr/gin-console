// TC: TC-QA-035@0b209cef
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-035: Not ready milestone (REQ-QA-012)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: the readiness of m2 of alpha is "Not ready": cases and gates fail, e2 waits on implementation_complete.
  const readiness = {
    milestone: { id: 'm2', title: 'Release' },
    epics: [{ id: 'e1', title: 'First', status: 'closed' }, { id: 'e2', title: 'Second', status: 'open' }],
    generated_at: '2026-11-27T03:00:00Z',
    verdict: 'not_ready',
    items: [
      readinessItem('cases', { state: 'fail', requirements: [{ id: 'REQ-UI-002', title: 'Lock out', capability: 'ui' }] }),
      readinessItem('results', { state: 'pass', note: null }),
      readinessItem('bugs', { state: 'unknown', error: 'the export snapshot cannot be read' }),
      readinessItem('gates', { state: 'fail', epics: [{ id: 'e2', title: 'Second', gate: 'implementation_complete' }] }),
    ],
  };
  await stubApi(page, { projects: ['alpha'], milestone: { m2: detail([epicPlan('e1')], { id: 'm2' }) } });
  await stubQa(page, { readiness });

  await ev.step('1. Open `/milestones/alpha/m2?tab=readiness`', async () => {
    await page.goto('/milestones/alpha/m2?tab=readiness');
    await expect(page.getByRole('heading', { name: 'Not ready' })).toBeVisible();
    const gates = page.getByRole('region', { name: 'Every epic shipped' });
    await expect(gates).toContainText('Fail');
    await expect(gates.getByText('1', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Every requirement has a case' })).toContainText('Fail');
    await expect(page.getByRole('region', { name: 'No open P0 or P1 bug' })).toContainText('the export snapshot cannot be read');
  });

  await ev.step('2. Open the list of `Every epic shipped`', async () => {
    const gates = page.getByRole('region', { name: 'Every epic shipped' });
    await gates.getByRole('button', { name: 'Show list' }).click();
    await expect(gates).toContainText('waiting on implementation_complete');
    await expect(gates.getByRole('link', { name: 'e2' })).toHaveAttribute('href', '/beads/alpha/e2');
  });
});
