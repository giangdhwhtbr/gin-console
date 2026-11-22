// TC: TC-UI-289@a52299e8
import { test, expect } from '../evidence';
import { stubReports, reportBody } from '../support/reports';

test('TC-UI-289: Late answer', async ({ page, ev }) => {
  // Precondition: the report for 30 days is delayed; the window is 900px wide.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.setViewportSize({ width: 900, height: 900 });
  await stubReports(page, { projects: ['alpha'] });
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let late = false;
  await page.route(/\/api\/reports\?/, async (route) => {
    const days = Number(new URL(route.request().url()).searchParams.get('days') ?? 30);
    if (days === 30) {
      await gate;
      late = true;
      return route.fulfill({ json: reportBody('alpha', 30, { errors: [{ project: 'alpha', error: 'answer for 30 days' }] }) }).catch(() => {});
    }
    return route.fulfill({ json: reportBody('alpha', days, { errors: [{ project: 'alpha', error: 'answer for 7 days' }] }) });
  });

  await ev.step('1. Open `/reports?project=alpha&days=30&tab=delivery`', async () => {
    await page.goto('/reports?project=alpha&days=30&tab=delivery');
    await expect(page.getByRole('tab', { name: /^Delivery/ })).toHaveAttribute('aria-selected', 'true');
  });

  await ev.step('2. Pick 7 days', async () => {
    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('answer for 7 days')).toBeVisible();
  });

  await ev.step('3. Let the answer for 30 days arrive', async () => {
    release();
    await expect.poll(() => late).toBe(true);
    await expect(page.getByText('answer for 7 days')).toBeVisible();
    await expect(page.getByText('answer for 30 days')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });
});
