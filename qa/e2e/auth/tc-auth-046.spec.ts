// TC: TC-AUTH-046@05cc6e89
import { test, expect } from '../evidence';

test('TC-AUTH-046: Sign-in screen with auth off (REQ-AUTH-014)', async ({ page, ev }) => {
  // Precondition: the server answers /api/auth/me with auth off, and no email is stored (the evidence fixture stores one first).
  await page.addInitScript(() => localStorage.removeItem('gin-console.email'));
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { enabled: false, user: null } }));
  await page.route('**/api/projects/beads', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open the console', async () => {
    await page.goto('/');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Username')).toHaveCount(0);
    await expect(page.getByLabel('Password')).toHaveCount(0);
  });
});
