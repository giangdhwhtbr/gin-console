// TC: TC-UI-140@a640d398
// TC: TC-UI-140@x
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';

test('TC-UI-140: Home address (REQ-UI-099)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a', 'b'], overview: overview([overviewProject('a'), overviewProject('b')]) });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/');
  });
});
