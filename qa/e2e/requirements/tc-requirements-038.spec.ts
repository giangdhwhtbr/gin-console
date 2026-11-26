// TC: TC-REQUIREMENTS-038@bdaf5020
import { test, expect } from '../evidence';
import { startMockupServer } from '../support/mockup-server';

test('TC-REQUIREMENTS-038: Interactive (REQ-REQUIREMENTS-011)', async ({ page, ev }) => {
  // Precondition: the second console server of TC-REQUIREMENTS-037; its mockup has a button and an inline script.
  const server = await startMockupServer();
  try {
    await ev.step('1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server', async () => {
      await page.goto(`${server.base}/requirements/mockups?project=m&mockup=ui%2F2026-11-22`);
      await expect(page.frameLocator('iframe').getByRole('button', { name: 'Click' })).toBeVisible();
    });

    await ev.step('2. Click the button of the mockup in the frame', async () => {
      const frame = page.frameLocator('iframe');
      await frame.getByRole('button', { name: 'Click' }).click();
      await expect(frame.locator('#out')).toHaveText('clicked');
    });
  } finally {
    await server.stop();
  }
});
