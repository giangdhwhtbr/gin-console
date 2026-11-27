// TC: TC-AUTH-047@b9bf4abf
import { test, expect } from '../evidence';
import { needAccount, signInAs } from './auth-session';

test("TC-AUTH-047: Project switcher lists only the user's projects (REQ-AUTH-007)", async ({ page, ev }) => {
  needAccount(); // the account has [alpha]; the console also holds beta
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page);

  await ev.step('1. Open the project switcher in the sidebar', async () => {
    await page.getByRole('button', { name: /^alpha\s*\d+ projects?$/ }).click();
    const list = page.getByRole('list', { name: 'Projects' });
    await expect(list.getByRole('button', { name: 'alpha', exact: true })).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText('beta')).toHaveCount(0);
  });
});
