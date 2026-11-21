// TC: TC-UI-010@195d371b
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf } from '../support/shell';

test('TC-UI-010: Beads page does not request the full projects list (REQ-UI-023)', async ({ page, ev }) => {
  // Precondition: two projects in /api/projects/beads; the stub logs every request.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubApi(page, { projects: ['a', 'b'], beads: beadsOf({ a: [bead('a-1', { ready: true })] }) });

  await ev.step('1. Open `/beads`', async () => {
    await page.goto('/beads');
    await expect(page.getByRole('link', { name: /Title a-1/ })).toBeVisible();
    expect(stub.calls.some((u) => u.pathname === '/api/projects/beads')).toBe(true);
    expect(stub.calls.filter((u) => u.pathname === '/api/projects')).toEqual([]);
  });
});
