// TC: TC-UI-312@ce752434
import { test, expect } from '../evidence';
import { e12Counted, openEpicStubs, withComments } from '../support/epic';
import { plain } from '../support/lanes';

const AMETHYST = 'rgb(106, 61, 184)'; // --identity of the light theme

test('TC-UI-312: Navigation links are not underlined', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await openEpicStubs(page, [...withComments(e12Counted()), ...plain()]);

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=example&view=list');
    await expect(page.getByRole('link', { name: 'Team checkout' })).toBeVisible();
  });

  await ev.step('2. Click the title of `ex-e12`', async () => {
    await page.getByRole('link', { name: 'Team checkout' }).click();
    await expect(page).toHaveURL(/\/beads\/example\/ex-e12/);
    await expect(page.getByRole('heading', { name: 'Team checkout', level: 1 })).toBeVisible();
  });

  await ev.step('3. Move the pointer onto the breadcrumb link "Beads"', async () => {
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Beads' }).hover();
  });

  await ev.step('4. Read the computed `text-decoration-line` and `color` of the link', async () => {
    const link = page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Beads' });
    await expect(link).toHaveCSS('text-decoration-line', 'none');
    await expect(link).toHaveCSS('color', AMETHYST);
  });
});
