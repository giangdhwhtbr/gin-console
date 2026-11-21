// TC: TC-UI-239@4cf5e61e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf } from '../support/shell';

test('TC-UI-239: Beads query (REQ-UI-126)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured, each with a bead.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'], beads: beadsOf({ a: [bead('a-1', { ready: true })], b: [bead('b-1', { ready: true })] }) });

  await ev.step('1. Open `/beads?project=zzz`', async () => {
    await page.goto('/beads?project=zzz');
    const notice = page.getByRole('status').filter({ hasText: 'No project zzz is configured' });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('link', { name: 'a', exact: true })).toHaveAttribute('href', '/beads?project=a');
    await expect(notice.getByRole('link', { name: 'b', exact: true })).toHaveAttribute('href', '/beads?project=b');
    await expect(page.getByRole('link', { name: /Title (a|b)-1/ })).toHaveCount(0);
  });
});
