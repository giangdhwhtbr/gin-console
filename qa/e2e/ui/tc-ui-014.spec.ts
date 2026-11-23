// TC: TC-UI-014@c429eec0
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-014: My Tasks skips a missing project directory', async ({ page, ev }) => {
  // Preconditions: C does not exist on disk; A exists and is current.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubApi(page, { projects: ['A', 'C'], beads: [bead('a-1', { title: 'Task of A', assignee: 'qa@example.com' })] });
  await page.route('**/api/projects/beads', (route) => route.fulfill({
    json: [
      { name: 'A', path: '/home/gin/A', exists: true, workflow: null, beads: null },
      { name: 'C', path: '/home/gin/C', exists: false, workflow: null, beads: null },
    ],
  }));

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByRole('link', { name: /Task of A/ })).toBeVisible();
    const asked = stub.calls.filter((u) => u.pathname === '/api/beads').map((u) => u.searchParams.get('project'));
    expect(asked).not.toContain('C');
    expect(asked).toContain('A');
  });
});
