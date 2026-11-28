// TC: TC-QA-052@8bb7387c
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseList, caseRow, qaFailure, stubQa, stubTrends } from '../support/qa';

test('TC-QA-052: Old gin-qa on the Trends tab only (REQ-QA-019)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: a gin-qa without the `runs` command whose case export works.
  await stubApi(page, { projects: ['alpha', 'beta'] });
  await stubQa(page, { cases: caseList([caseRow('TC-UI-001')]) });
  await stubTrends(page, qaFailure("invalid choice: 'runs'", 'outdated'));

  await ev.step('1. Open `/tests?project=alpha&tab=trends`', async () => {
    await page.goto('/tests?project=alpha&tab=trends');
    await expect(page.getByText('This gin-qa is too old; run gin-workflow/install.sh --plugin gin-qa')).toBeVisible();
    await expect(page.getByRole('img', { name: /^Pass rate per day/ })).toHaveCount(0);
  });

  await ev.step('2. Open the Cases tab', async () => {
    await page.getByRole('tab', { name: 'Cases' }).click();
    await expect(page.getByRole('link', { name: 'TC-UI-001' })).toBeVisible();
  });
});
