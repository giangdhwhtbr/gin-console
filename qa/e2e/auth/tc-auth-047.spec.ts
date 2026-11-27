// TC: TC-AUTH-047@b9bf4abf
import { test, expect } from '../evidence';
import { needAccount, OTHER_PROJECT, OWN_PROJECT, signInAs } from './auth-session';

test("TC-AUTH-047: Project switcher lists only the user's projects (REQ-AUTH-007)", async ({ page, ev }) => {
  needAccount(); // the account has only OWN_PROJECT; the console also holds OTHER_PROJECT
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page);

  await ev.step('1. Open the project switcher in the sidebar', async () => {
    await page.getByRole('button', { name: new RegExp(`^${OWN_PROJECT}\\s*\\d+ projects?$`) }).click();
    const list = page.getByRole('list', { name: 'Projects' });
    await expect(list.getByRole('button', { name: OWN_PROJECT, exact: true })).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText(OTHER_PROJECT)).toHaveCount(0);
  });
});
