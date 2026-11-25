// TC: TC-REQUIREMENTS-056@4cf5fc3d
import { test, expect } from '../evidence';
import { mockup, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-056: Show a mockup (REQ-REQUIREMENTS-018)', async ({ page, ev }) => {
  // Precondition: a confirmed folder ui 2026-11-22 holds mockup/index.html, confirmed by ba, used by REQ-UI-129.
  await stubRequirements(page, {
    projects: ['a'],
    mockups: { mockups: [mockup({ requirements: ['REQ-UI-129'], description: 'Reports screen' })] },
    files: { 'mockup/index.html': { type: 'text/html; charset=utf-8', body: '<!doctype html><title>m</title><p>Hello mockup</p>' } },
  });

  await ev.step('1. Open `/requirements/mockups?project=a`', async () => {
    await page.goto('/requirements/mockups?project=a');
    const main = page.getByRole('main');
    await expect(main.getByText(/Confirmed .* by ba/)).toBeVisible();
    await expect(main.getByRole('link', { name: 'REQ-UI-129' })).toHaveAttribute('href', '/requirements/matrix?project=a&req=REQ-UI-129');
    await expect(page.locator('iframe')).toHaveCount(0);
  });

  await ev.step('2. Choose the folder', async () => {
    await page.getByRole('main').getByRole('link', { name: /^ui / }).click();
    await expect(page).toHaveURL((url) => url.searchParams.get('mockup') === 'ui/2026-11-22');
    const shown = page.locator('section[aria-label^="ui "]');
    await expect(shown.getByText('Reports screen')).toBeVisible();
    await expect(shown.getByRole('button', { name: 'mockup/index.html' })).toHaveAttribute('aria-pressed', 'true');
    await expect(shown.getByRole('link', { name: 'Open in a new tab' })).toHaveAttribute('href', '/api/requirements/mockups/a/files/ui/2026-11-22/mockup/index.html');
    await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts');
    await expect(page.frameLocator('iframe').getByText('Hello mockup')).toBeVisible();
  });
});
