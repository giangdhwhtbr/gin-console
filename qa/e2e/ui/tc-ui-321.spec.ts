// TC: TC-UI-321@9c95f1b4
// TC: TC-UI-321@x
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-321: Closed beads hidden (REQ-UI-101)', async ({ page, ev }) => {
  // Precondition: project A has 3 open and 2 closed beads assigned to the user.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const beads = [
    bead('a-1', { ready: true, assignee: 'qa@example.com' }), bead('a-2', { ready: true, assignee: 'qa@example.com' }), bead('a-3', { ready: true, assignee: 'qa@example.com' }),
    bead('a-4', { assignee: 'qa@example.com', status: 'closed', closed_at: '2026-10-11T00:00:00Z' }),
    bead('a-5', { assignee: 'qa@example.com', status: 'closed', closed_at: '2026-10-12T00:00:00Z' }),
  ];
  const stub = await stubApi(page, { projects: ['A'], beads });
  const rows = page.getByRole('link', { name: /^a-\d Title a-\d$/ });
  const beadCalls = () => stub.calls.filter((u) => u.pathname === '/api/beads');

  await ev.step('1. Open `/my-tasks?project=A`', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(rows).toHaveCount(3);
    await expect(page.getByRole('heading', { name: /^Assigned to me\b/ })).toContainText('3');
    await expect(page.getByRole('heading', { name: /^Closed\b/ })).toHaveCount(0);
    expect(beadCalls().length).toBeGreaterThan(0);
    for (const u of beadCalls()) expect(u.searchParams.get('closed')).toBeNull();
  });
});
