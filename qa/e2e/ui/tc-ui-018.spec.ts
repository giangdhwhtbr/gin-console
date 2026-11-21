// TC: TC-UI-018@2da4f70a
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-018: Shared link (REQ-UI-088)', async ({ page, ev }) => {
  // Precondition: the URL /reports?project=all&days=7&tab=delivery.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=all&days=7&tab=delivery`', async () => {
    await page.goto('/reports?project=all&days=7&tab=delivery');
    await expect(page.getByRole('combobox', { name: 'Project' }).locator('option:checked')).toHaveText('All projects');
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => stub.calls.some((u) => u.pathname === '/api/reports' && u.searchParams.get('project') === 'all' && u.searchParams.get('days') === '7')).toBe(true);
  });
});
