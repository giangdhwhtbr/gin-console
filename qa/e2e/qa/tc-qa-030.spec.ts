// TC: TC-QA-030@468bf2b3
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { caseDetail, caseList, caseRow, latestRun, qaFailure, readinessItem, stubQa } from '../support/qa';

test('TC-QA-030: Tests page at 390px (REQ-QA-010)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // Precondition: project alpha with cases in many capabilities and types.
  const names = ['accounts', 'beads', 'configuration', 'milestone-ui', 'requirements', 'reports', 'overview'];
  const cases = names.map((capability, i) =>
    caseRow(`TC-${capability.toUpperCase()}-001`, { capability, type: ['e2e', 'api', 'manual'][i % 3], effective_result: ['passed', 'failed', 'not run', 'outdated'][i % 4] }),
  );
  await stubApi(page, { projects: ['alpha'] });
  await stubQa(page, { cases: caseList(cases) });

  await ev.step('1. Set the window to 390px wide', async () => {
    await page.setViewportSize({ width: 390, height: 900 });
  });

  await ev.step('2. Open `/tests?project=alpha`', async () => {
    await page.goto('/tests?project=alpha');
    await expect(page.getByRole('table')).toHaveCount(2);
    const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, window: window.innerWidth }));
    expect(widths.page).toBeLessThanOrEqual(widths.window);
  });
});
