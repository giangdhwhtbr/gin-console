// TC: TC-AUTH-045@914e5d33
import { test, expect } from '../evidence';
import { fillSignIn, needAccount } from './auth-session';

// Each run adds 6 failures to the IP's count: a retry would double that, so this spec never retries.
test.describe.configure({ retries: 0 });

test('TC-AUTH-045: Too many attempts message (REQ-AUTH-014)', async ({ page, ev }) => {
  needAccount(); // only to skip on a console without auth
  // A name that has no account and is new on each run: the limit counts failures per name, so no real account is locked.
  const name = `limit-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  await ev.step('1. Open the console', async () => {
    await page.goto('/');
    await expect(page.getByLabel('Username')).toBeVisible();
  });

  await ev.step('2. Enter the user name and the wrong password, then select Sign in, 5 times', async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await fillSignIn(page, name, 'wrong');
      await expect(page.getByRole('alert')).toHaveText('Wrong username or password');
    }
  });

  await ev.step('3. Select Sign in a sixth time', async () => {
    await fillSignIn(page, name, 'wrong');
    await expect(page.getByRole('alert')).toHaveText('Too many attempts. Try again in 15 minutes');
  });
});
