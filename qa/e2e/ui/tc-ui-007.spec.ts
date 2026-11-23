// TC: TC-UI-007@7835c3b9
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const projectsOf = (stale: Record<string, boolean | undefined>) => Object.entries(stale).map(([name, s]) => ({
  name, path: `/home/gin/${name}`, exists: true, workflow: null,
  beads: { total: 1, open: 1, in_progress: 0, blocked: 0, ready: 1, epics: [], ...(s === undefined ? {} : { stale: s }) },
}));

test('TC-UI-007: No note when beads are not stale', async ({ page, ev }) => {
  // Precondition: A has no stale key (the first run), then stale: false (the second).
  for (const stale of [undefined, false]) {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await stubApi(page, { projects: ['A'], beads: [bead('a-1', { title: 'First bead', ready: true })] });
    await page.route('**/api/projects/beads', (route) => route.fulfill({ json: projectsOf({ A: stale }) }));
    if (stale === undefined) {
      await ev.step('1. Open /beads?project=A', async () => {
        await page.goto('/beads?project=A');
        await expect(page.getByRole('link', { name: /First bead/ })).toBeVisible();
        await expect(page.getByText(/may be out of date/)).toHaveCount(0);
      });
    } else {
      await page.goto('/beads?project=A');
      await expect(page.getByRole('link', { name: /First bead/ })).toBeVisible();
      await expect(page.getByText(/may be out of date/)).toHaveCount(0);
    }
  }
});
