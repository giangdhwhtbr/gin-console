// TC: TC-UI-283@bd002973
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-283: My Tasks same handle at another domain', async ({ page, ev }) => {
  // Precondition: signed in as giangdhwhtbr@gmail.com; project A has an open bead assigned to giangdhwhtbr@other.example.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'giangdhwhtbr@gmail.com'));
  const byProject = { A: [bead('A-1', { title: 'Other domain task', assignee: 'giangdhwhtbr@other.example', ready: true })] };
  await stubApi(page, { projects: ['A'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByRole('link', { name: 'Other domain task' })).toBeVisible();
  });
});
