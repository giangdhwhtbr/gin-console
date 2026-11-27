// Shared by the specs of the optional-authentication change (REQ-AUTH-014, 015, 007, 016). They run against a real
// console started with `auth.enabled: true` (a Playwright config pointing `baseURL` at it), because the session
// cookie, the rate limit and the mockup grant belong to the server. The account is named by two environment
// variables, never written in a spec; a spec skips itself when they are unset (the default e2e server has no auth).
import { expect, test, type Page } from '@playwright/test';

// The fixtures of the auth-on console (see qa/guidelines.md, "Auth e2e server"): the user's project, a project the
// user may not see, and the confirmed mockup of the user's project, whose style.css colours its heading.
export const OWN_PROJECT = 'alpha';
export const OTHER_PROJECT = 'beta';
export const MOCKUP_FOLDER = 'ui/2026-11-22';
export const MOCKUP_COLOR = 'rgb(200, 30, 60)';

export const account = () => ({
  user: process.env.GIN_E2E_AUTH_USER ?? '',
  password: process.env.GIN_E2E_AUTH_PASSWORD ?? '',
});

/** Call first in a spec that needs the account. */
export function needAccount(): void {
  test.skip(!account().user || !account().password, 'set GIN_E2E_AUTH_USER and GIN_E2E_AUTH_PASSWORD (a console with auth on)');
}

export async function fillSignIn(page: Page, user: string, password: string): Promise<void> {
  await page.getByLabel('Username').fill(user);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Open `path` and sign in as the account; waits for the header's Sign out button. */
export async function signInAs(page: Page, path = '/'): Promise<void> {
  const { user, password } = account();
  await page.goto(path);
  await fillSignIn(page, user, password);
  await expect(page.getByRole('button', { name: `Sign out ${user}` })).toBeVisible();
}
