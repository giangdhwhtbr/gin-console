// TC: TC-UI-025@0de7c732
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-025: Shared link (REQ-UI-095)', async ({ page, ev }) => {
  // Precondition: the URL /reports?project=alpha&days=7&tab=quality; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  const stub = await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=alpha&days=7&tab=quality`', async () => {
    await page.goto('/reports?project=alpha&days=7&tab=quality');
    await expect(page.getByRole('tab', { name: /^Quality/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-quality').getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => stub.calls.some((u) => u.pathname === '/api/reports' && u.searchParams.get('project') === 'alpha' && u.searchParams.get('days') === '7')).toBe(true);
  });
});
