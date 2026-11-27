// TC: TC-UI-420@e9928485
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, stubQa } from '../support/qa';
import { mainNav } from '../support/shell';

test('TC-UI-420: Tests of the current project (REQ-UI-124)', async ({ page, ev }) => {
  // Precondition: projects b and c are configured and the current project is b.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['b', 'c'] });
  await stubQa(page, { cases: caseList([caseRow('TC-UI-001')]), details: { 'TC-UI-001': caseDetail('TC-UI-001') } });

  await ev.step('1. Open `/tests`', async () => {
    await page.goto('/tests?project=b');
    await page.goto('/tests');
    await expect(page.getByRole('heading', { name: 'Tests', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/tests\?project=b$/);
  });

  await ev.step('2. Open `/tests/c/TC-UI-001`', async () => {
    await page.goto('/tests/c/TC-UI-001');
    await expect(page.getByRole('heading', { name: 'TC-UI-001 Title of TC-UI-001' })).toBeVisible();
    await expect(mainNav(page).getByRole('link', { name: 'Beads', exact: true })).toHaveAttribute('href', '/beads?project=c');
  });
});
