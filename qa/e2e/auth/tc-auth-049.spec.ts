// TC: TC-AUTH-049@efb5efd2
import { test, expect } from '../evidence';
import { account, needAccount, signInAs } from './auth-session';

test('TC-AUTH-049: Sign out returns to sign-in (REQ-AUTH-006, REQ-AUTH-014)', async ({ page, ev }) => {
  needAccount();
  const { user } = account();
  await signInAs(page);

  await ev.step('1. Select Sign out in the header', async () => {
    await page.getByRole('button', { name: `Sign out ${user}` }).click();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByRole('button', { name: `Sign out ${user}` })).toHaveCount(0);
  });
});
