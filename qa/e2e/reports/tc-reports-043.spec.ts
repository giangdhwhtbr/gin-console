// TC: TC-REPORTS-043@8e6b82a6
import { test, expect } from '../evidence';
import { stubReports, teamBody } from '../support/reports';

test('TC-REPORTS-043: Late answer (REQ-REPORTS-017)', async ({ page, ev }) => {
  // Precondition: alpha has milestones m1 and m2; the answer for m2 is held back until the spec releases it.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubReports(page, { projects: ['alpha'] });
  const milestones = [
    { id: 'm1', title: 'First', status: 'closed', start: '2026-10-05', end: '2026-10-30', closed_on: '2026-10-30' },
    { id: 'm2', title: 'Second', status: 'active', start: '2026-11-02', end: '2026-11-27', closed_on: null },
  ];
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/reports/team**', async (route) => {
    const chosen = new URL(route.request().url()).searchParams.get('milestone');
    if (chosen === 'm2') await held;
    const id = chosen === 'm2' ? 'm2' : 'm1';
    await route.fulfill({ json: { ...teamBody('alpha'), milestones, milestone: id } });
  });
  const select = page.getByRole('combobox', { name: 'Milestone' });

  await ev.step('1. Open `/reports?project=alpha&tab=team&milestone=m1`', async () => {
    await page.goto('/reports?project=alpha&tab=team&milestone=m1');
    await expect(select).toHaveValue('m1');
  });

  await ev.step('2. Pick `m2` in the Milestone select', async () => {
    await select.selectOption('m2');
    await expect(page.getByText('Loading team…')).toBeVisible();
  });

  await ev.step('3. Open "Reports" in the Main navigation', async () => {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Reports' }).click();
    await expect(select).toHaveValue('m1');
  });

  await ev.step('4. Release the delayed answer for `m2`', async () => {
    release();
    await page.waitForTimeout(300);
    await expect(select).toHaveValue('m1');
    await expect(page).toHaveURL(/milestone=m1/);
  });
});
