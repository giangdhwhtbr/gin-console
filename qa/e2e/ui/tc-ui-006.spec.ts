// TC: TC-UI-006@6385ed53
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf } from '../support/shell';

const projectsOf = (stale: Record<string, boolean | undefined>) => Object.entries(stale).map(([name, s]) => ({
  name, path: `/home/gin/${name}`, exists: true, workflow: null,
  beads: { total: 1, open: 1, in_progress: 0, blocked: 0, ready: 1, epics: [], ...(s === undefined ? {} : { stale: s }) },
}));

test('TC-UI-006: My Tasks shows the note of the current project only', async ({ page, ev }) => {
  // Precondition: A and B are stale, both have tasks for the signed-in email; A is current.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const byProject = {
    A: [bead('a-1', { title: 'Task of A', assignee: 'qa@example.com' })],
    B: [bead('b-1', { title: 'Task of B', assignee: 'qa@example.com' })],
  };
  await stubApi(page, { projects: ['A', 'B'], beads: beadsOf(byProject) });
  await page.route('**/api/projects/beads', (route) => route.fulfill({ json: projectsOf({ A: true, B: true }) }));

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByRole('link', { name: /Task of A/ })).toBeVisible();
    await expect(page.getByText(/Beads of A may be out of date/)).toHaveCount(1);
    await expect(page.getByText(/Beads of B may be out of date/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Task of B/ })).toHaveCount(0);
  });
});
