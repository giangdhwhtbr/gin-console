// TC: TC-REQUIREMENTS-037@12807b22
import { test, expect } from '../evidence';
import { startMockupServer } from '../support/mockup-server';

test('TC-REQUIREMENTS-037: Script calls the API (REQ-REQUIREMENTS-011)', async ({ page, context, ev }) => {
  // Precondition: a second console server of this checkout runs on a free port with project m and a confirmed mockup
  // whose script calls fetch('/api/projects/beads') and a no-cors POST to /api/refresh.
  const server = await startMockupServer();
  const count = (needle: string) => server.log().split('\n').filter((line) => line.includes(needle)).length;
  const fromFrames: string[] = [];
  page.on('request', (request) => {
    if (request.frame() !== page.mainFrame()) fromFrames.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  try {
    await ev.step('1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server', async () => {
      await page.goto(`${server.base}/requirements/mockups?project=m&mockup=ui%2F2026-11-22`);
      await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts');
    });

    await ev.step('2. Read the outcome the mockup shows in the frame', async () => {
      const frame = page.frameLocator('iframe');
      await expect(frame.locator('#beads')).toHaveText('blocked');
      await expect(frame.locator('#refresh')).toHaveText('blocked');
      expect(fromFrames.filter((r) => r.endsWith('/api/refresh') || r.endsWith('/api/projects/beads'))).toEqual([]);
    });

    const beadsBefore = count('GET /api/projects/beads');
    let own: import('@playwright/test').Page;
    await ev.step('3. Open the mockup file in its own tab', async () => {
      const href = await page.getByRole('link', { name: 'Open in a new tab' }).getAttribute('href');
      expect(href).toBe('/api/requirements/mockups/m/files/ui/2026-11-22/index.html');
      own = await context.newPage();
      await own.goto(`${server.base}${href}`);
    });

    await ev.step('4. Read the outcome the mockup shows in that tab', async () => {
      await expect(own.locator('#beads')).toHaveText('blocked');
      await expect(own.locator('#refresh')).toHaveText('blocked');
    });

    await ev.step('5. Read the server log', async () => {
      expect(count('POST /api/refresh')).toBe(0);
      expect(count('GET /api/projects/beads')).toBe(beadsBefore);
    });
  } finally {
    await server.stop();
  }
});
