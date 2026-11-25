// TC: TC-UI-382@ca9faec1
// TC: TC-UI-382@x
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';

test('TC-UI-382: Overview title (REQ-UI-063)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured and the current project is a.
  await signIn(page);
  await stubApi(page, { projects: ['a', 'b'], overview: overview([overviewProject('a'), overviewProject('b')]) });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('Overview · gin-console');
  });
});
