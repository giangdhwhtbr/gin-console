// TC: TC-AUTH-048@94c34e90
import { test, expect } from '../evidence';
import { needAccount, signInAs } from './auth-session';

test('TC-AUTH-048: Styled mockup through the grant (REQ-AUTH-016)', async ({ page, ev }) => {
  needAccount(); // alpha holds the confirmed mockup ui/2026-11-22: index.html links style.css (h1 { color: rgb(200, 30, 60) })
  await signInAs(page);

  await ev.step('1. Open /requirements/mockups?project=alpha&mockup=ui/2026-11-22', async () => {
    await page.goto('/requirements/mockups?project=alpha&mockup=ui%2F2026-11-22');
    const frame = page.locator('iframe');
    await expect(frame).toHaveAttribute('src', /^\/api\/requirements\/mockups\/alpha\/g\/[^/]+\/files\/ui\/2026-11-22\/index\.html$/);
    const heading = page.frameLocator('iframe').locator('#title');
    await expect(heading).toHaveText('alpha mockup');
    await expect(heading).toHaveCSS('color', 'rgb(200, 30, 60)');
  });
});
