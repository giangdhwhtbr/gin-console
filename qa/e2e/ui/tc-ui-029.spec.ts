// TC: TC-UI-029@0abb7ba9
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-029: Retired tab in a link (REQ-UI-095)', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=alpha&days=7&tab=quality`', async () => {
    await page.goto('/reports?project=alpha&days=7&tab=quality');
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/reports/rework?project=alpha&days=7');
    await expect(page.getByRole('link', { name: /^Rework/ })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('2. Open `/reports?project=alpha&tab=coverage`', async () => {
    await page.goto('/reports?project=alpha&tab=coverage');
    await expect(page).toHaveURL((u) => u.pathname === '/reports/status' && u.searchParams.get('project') === 'alpha' && !u.searchParams.has('tab'));
    await expect(page.getByRole('link', { name: /^Status/ })).toHaveAttribute('aria-current', 'page');
  });

  await ev.step('3. Open `/reports?project=alpha`', async () => {
    await page.goto('/reports?project=alpha');
    await expect(page).toHaveURL((u) => u.pathname === '/reports/status' && u.searchParams.get('project') === 'alpha');
    await expect(page.getByRole('link', { name: /^Status/ })).toHaveAttribute('aria-current', 'page');
  });
});
