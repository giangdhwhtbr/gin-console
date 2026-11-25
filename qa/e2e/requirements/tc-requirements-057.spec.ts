// TC: TC-REQUIREMENTS-057@dc5897db
import { test, expect } from '../evidence';
import { mockup, stubRequirements, PNG } from '../support/requirements';

test('TC-REQUIREMENTS-057: Images only (REQ-REQUIREMENTS-018)', async ({ page, ev }) => {
  // Precondition: a confirmed folder holds two PNG files and no HTML.
  await stubRequirements(page, {
    projects: ['a'],
    mockups: { mockups: [mockup({ html: [], images: ['one.png', 'two.png'] })] },
    files: { 'one.png': { type: 'image/png', body: PNG }, 'two.png': { type: 'image/png', body: PNG } },
  });

  await ev.step('1. Open `/requirements/mockups?project=a&mockup=ui/2026-11-22`', async () => {
    await page.goto('/requirements/mockups?project=a&mockup=ui%2F2026-11-22');
    const shown = page.locator('section[aria-label^="ui "]');
    await expect(shown.getByRole('img', { name: 'one.png' })).toBeVisible();
    await expect(shown.getByRole('img', { name: 'two.png' })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
  });
});
