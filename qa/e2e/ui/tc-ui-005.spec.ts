// TC: TC-UI-005@059920c6
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const projectsOf = (stale: Record<string, boolean | undefined>) => Object.entries(stale).map(([name, s]) => ({
  name, path: `/home/gin/${name}`, exists: true, workflow: null,
  beads: { total: 1, open: 1, in_progress: 0, blocked: 0, ready: 1, epics: [], ...(s === undefined ? {} : { stale: s }) },
}));

test('TC-UI-005: Beads page shows the stale note above the list', async ({ page, ev }) => {
  // Precondition: project A is stale and has beads.
  await stubApi(page, { projects: ['A'], beads: [bead('a-1', { title: 'First bead', ready: true })] });
  await page.route('**/api/projects/beads', (route) => route.fulfill({ json: projectsOf({ A: true }) }));

  await ev.step('1. Open /beads?project=A', async () => {
    await page.goto('/beads?project=A');
    const note = page.getByText('Beads of A may be out of date.');
    await expect(note).toBeVisible();
    await expect(note).toContainText('Run bd export -o .beads/issues.jsonl in A.');
    const list = page.getByRole('link', { name: /First bead/ });
    await expect(list).toBeVisible();
    const [n, l] = [await note.boundingBox(), await list.boundingBox()];
    expect(n!.y).toBeLessThan(l!.y);
  });
});
