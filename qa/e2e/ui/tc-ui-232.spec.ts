// TC: TC-UI-232@368661c1
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-UI-232: Last chosen beats the favorite (REQ-UI-124)', async ({ page, ev }) => {
  // Precondition: projects a and b; the favorite is a and b was chosen earlier in this tab.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await page.addInitScript(() => {
    window.localStorage.setItem('gin-console-favorite-project', 'a');
    window.sessionStorage.setItem('gin-console-project', 'b');
  });
  const stub = await stubApi(page, {
    projects: ['a', 'b'],
    milestones: (url) => list([entry('M1', { title: `Milestone of ${url.searchParams.get('project')}` })]),
  });

  await ev.step('1. Open `/milestones`', async () => {
    await page.goto('/milestones');
    await expect(page).toHaveURL((url) => url.pathname + url.search === '/milestones?project=b');
    await expect(page.getByRole('list', { name: 'Milestones' }).getByRole('listitem')).toContainText('Milestone of b');
    expect(stub.calls.some((u) => u.pathname === '/api/milestones' && u.searchParams.get('project') === 'a')).toBe(false);
  });
});
