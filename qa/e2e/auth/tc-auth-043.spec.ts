// TC: TC-AUTH-043@5094d8c1
import { test, expect } from '../evidence';
import { account, needAccount, OWN_PROJECT } from './auth-session';

test('TC-AUTH-043: Sign in with the right password (REQ-AUTH-014)', async ({ page, ev }) => {
  needAccount();
  const { user, password } = account();

  await ev.step('1. Open the console', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'gin-console' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
  });

  await ev.step('2. Enter the user name and the password', async () => {
    await page.getByLabel('Username').fill(user);
    await page.getByLabel('Password').fill(password);
  });

  await ev.step('3. Select Sign in', async () => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: `Sign out ${user}` })).toBeVisible();
    // My work uses the email the server holds for the user (the account's email is <user>@x.io)
    await page.goto(`/my-tasks?project=${OWN_PROJECT}`);
    await expect(page.getByText(`No work for ${user}@x.io`)).toBeVisible();
  });
});
