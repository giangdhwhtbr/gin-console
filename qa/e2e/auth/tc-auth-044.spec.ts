// TC: TC-AUTH-044@14bcdbd7
import { test, expect } from '../evidence';
import { account, needAccount } from './auth-session';

test('TC-AUTH-044: Wrong password message (REQ-AUTH-014)', async ({ page, ev }) => {
  needAccount();
  const { user } = account();

  await ev.step('1. Open the console', async () => {
    await page.goto('/');
    await expect(page.getByLabel('Username')).toBeVisible();
  });

  await ev.step('2. Enter the user name and a wrong password', async () => {
    await page.getByLabel('Username').fill(user);
    await page.getByLabel('Password').fill('not-the-password');
  });

  await ev.step('3. Select Sign in', async () => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Wrong username or password');
    await expect(page.getByLabel('Username')).toHaveValue(user);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
