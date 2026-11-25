// TC: TC-UI-283@77dd3ae4
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { beadsOf, stubBeadPages } from '../support/shell';

test('TC-UI-283: My work same handle at another domain', async ({ page, ev }) => {
  // Precondition: signed in as giangdhwhtbr@gmail.com; project A has an open bead assigned to giangdhwhtbr@other.example.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'giangdhwhtbr@gmail.com'));
  const byProject = { A: [bead('A-1', { title: 'Other domain task', assignee: 'giangdhwhtbr@other.example', ready: true })] };
  await stubApi(page, { projects: ['A'], beads: beadsOf(byProject) });
  await stubBeadPages(page, byProject);

  await ev.step('1. Open /my-tasks?project=A', async () => {
    await page.goto('/my-tasks?project=A');
    await expect(page.getByRole('heading', { name: /^Assigned to me\b/ }).locator('xpath=..').getByRole('link', { name: 'Other domain task' })).toBeVisible();
  });
});
