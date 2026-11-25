// TC: TC-UI-231@21e98cc6
import { test, expect } from '../evidence';
import { stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-231: Links carry the project (REQ-UI-124)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is b.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'] });

  await ev.step('1. Open `/my-tasks?project=b`', async () => {
    await page.goto('/my-tasks?project=b');
    const nav = mainNav(page);
    await expect(nav.getByRole('link', { name: 'Beads', exact: true })).toHaveAttribute('href', '/beads?project=b');
    await expect(nav.getByRole('link', { name: 'Milestones', exact: true })).toHaveAttribute('href', '/milestones?project=b');
    await expect(nav.getByRole('link', { name: 'Reports', exact: true })).toHaveAttribute('href', '/reports/status?project=b');
    await expect(nav.getByRole('link', { name: 'My work', exact: true })).toHaveAttribute('href', '/my-tasks?project=b');
    await expect(nav.locator('a[href="/"]')).toHaveCount(0);
  });
});
