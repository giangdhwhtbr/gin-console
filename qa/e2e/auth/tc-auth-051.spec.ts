// TC: TC-AUTH-051@eb0a61f2
import { test, expect } from '../evidence';
import { account, needAccount, signInAs } from './auth-session';

test('TC-AUTH-051: Session lost while open (REQ-AUTH-015)', async ({ page, ev }) => {
  needAccount();
  const { user, password } = account();
  await signInAs(page, '/beads?project=alpha');
  await expect(page).toHaveURL(/\/beads\?project=alpha/);

  await ev.step('1. The server answers the next data request with 401', async () => {
    await page.route('**/api/beads?*', (route) => route.fulfill({ status: 401, json: { error: 'sign-in required' } }));
    await page.route('**/api/auth/me', (route) => route.fulfill({ json: { enabled: true, user: null } }));
  });

  await ev.step('2. Open the Beads page again', async () => {
    await page.reload();
    await expect(page.getByLabel('Username')).toBeVisible();
  });

  await ev.step('3. Sign in again', async () => {
    await page.unroute('**/api/beads?*');
    await page.unroute('**/api/auth/me');
    await page.getByLabel('Username').fill(user);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: `Sign out ${user}` })).toBeVisible();
    await expect(page).toHaveURL(/\/beads\?project=alpha/);
  });
});
