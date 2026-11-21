// TC: TC-UI-252@aff0cae1
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

test('TC-UI-252: Loading (REQ-UI-063)', async ({ page, ev }) => {
  // Precondition: project example has milestone m1, whose request has not been answered yet.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await stubApi(page, { projects: ['example'], milestone: { m1: detail([epicPlan('E1')], { id: 'm1', title: 'Beta readiness' }) } });
  await page.route('**/api/milestones/example/m1**', async (route) => {
    await gate;
    await route.fallback();
  });

  await ev.step('1. Open `/milestones/example/m1`', async () => {
    await page.goto('/milestones/example/m1', { waitUntil: 'commit' });
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).toHaveTitle('gin-console');
    release();
    await expect(page).toHaveTitle('Beta readiness · example · gin-console');
  });
});
