// TC: TC-QA-036@8f076d11
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-036: Readiness request fails (REQ-QA-012)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: gin milestone show fails for m2, so the readiness request answers 502 with an error.
  await stubApi(page, { projects: ['alpha'], milestone: { m2: detail([epicPlan('e1')], { id: 'm2' }) } });
  await stubQa(page, { readiness: qaFailure('gin milestone show failed') });

  await ev.step('1. Open `/milestones/alpha/m2?tab=readiness`', async () => {
    await page.goto('/milestones/alpha/m2?tab=readiness');
    await expect(page.getByText('gin milestone show failed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
