// TC: TC-AUTH-048@703c7472
import { test, expect } from '../evidence';
import { MOCKUP_COLOR, MOCKUP_FOLDER, needAccount, OWN_PROJECT, signInAs } from './auth-session';

test('TC-AUTH-048: Styled mockup through the grant (REQ-AUTH-016)', async ({ page, ev }) => {
  needAccount(); // OWN_PROJECT holds the confirmed MOCKUP_FOLDER: index.html links style.css, which colours its h1 MOCKUP_COLOR
  await signInAs(page);

  await ev.step('1. Open the mockups page of the user\'s project with the mockup chosen', async () => {
    await page.goto(`/requirements/mockups?project=${OWN_PROJECT}&mockup=${encodeURIComponent(MOCKUP_FOLDER)}`);
    const frame = page.locator('iframe');
    await expect(frame).toHaveAttribute('src', new RegExp(`^/api/requirements/mockups/${OWN_PROJECT}/g/[\\w-]+\\.[\\w-]+/files/${MOCKUP_FOLDER}/index\\.html$`));
    const heading = page.frameLocator('iframe').locator('#title');
    await expect(heading).toHaveText(`${OWN_PROJECT} mockup`);
    await expect(heading).toHaveCSS('color', MOCKUP_COLOR);
  });
});
