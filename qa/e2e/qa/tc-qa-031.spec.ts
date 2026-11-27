// TC: TC-QA-031@6b1bf084
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-031: Run with screenshots (REQ-QA-011)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: TC-UI-115 whose latest run has two steps: step 1 with a screenshot, step 2 failed with an error and none.
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, {
    screenshots: true,
    details: {
      'TC-UI-115': caseDetail('TC-UI-115', {
        result: 'failed', effective_result: 'failed', reqs: ['REQ-UI-001'],
        bug: { id: 'gin-console-3kd', title: 'Save fails', status: 'open', priority: 1 },
        steps: ['Open the page', 'Click save'], expected: ['It is saved'],
        latest_run: latestRun([
          { n: 1, title: 'Open the page', status: 'passed', error: null, screenshot: true },
          { n: 2, title: 'Click save', status: 'failed', error: 'Timed out waiting for the save button', screenshot: false },
        ]),
        latest_run_reason: null,
      }),
    },
  });

  await ev.step('1. Open `/tests/alpha/TC-UI-115`', async () => {
    await page.goto('/tests/alpha/TC-UI-115');
    await expect(page.getByRole('heading', { name: 'TC-UI-115 Title of TC-UI-115' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'REQ-UI-001' })).toBeVisible();
    const bug = page.getByRole('link', { name: 'gin-console-3kd' });
    await expect(bug).toHaveAttribute('href', '/beads/alpha/gin-console-3kd');
    await expect(page.getByText('P1')).toBeVisible();
    const run = page.getByRole('region', { name: 'Latest run' });
    await expect(run).toContainText('qa/evidence/2026-11-23T10-34-33');
    const steps = run.getByRole('list', { name: 'Run steps' }).getByRole('listitem');
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(1)).toContainText('Timed out waiting for the save button');
    await expect(steps.nth(1).getByRole('button')).toHaveCount(0);
  });

  await ev.step('2. Activate the thumbnail of step 1', async () => {
    await page.getByRole('button', { name: 'Open screenshot of step 1' }).click();
    const image = page.getByRole('img', { name: '1. Open the page' });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });
});
