// TC: TC-UI-018@5903effb
import { test, expect } from '../evidence';
import { stubReports } from '../support/reports';

test('TC-UI-018: Old link for all projects (REQ-UI-088)', async ({ page, ev }) => {
  // Preconditions: the current project is alpha; the URL is the retired /reports?project=all&days=7&tab=delivery.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubReports(page, { projects: ['alpha'] });

  await ev.step('1. Open `/reports?project=all&days=7&tab=delivery`', async () => {
    await page.goto('/reports?project=all&days=7&tab=delivery');
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/reports?project=alpha&days=7&tab=delivery');
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('combobox', { name: 'Project' })).toHaveCount(0);
    await expect.poll(() => stub.calls.some((u) => u.pathname === '/api/reports' && u.searchParams.get('project') === 'alpha' && u.searchParams.get('days') === '7')).toBe(true);
    expect(stub.calls.some((u) => u.pathname === '/api/reports' && u.searchParams.get('project') === 'all')).toBe(false);
  });
});
