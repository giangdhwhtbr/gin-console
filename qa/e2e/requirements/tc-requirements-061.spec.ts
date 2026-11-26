// TC: TC-REQUIREMENTS-061@143a453d
// TC: TC-REQUIREMENTS-061
import { test, expect } from '../evidence';
import { startMockupServer } from '../support/mockup-server';

test('TC-REQUIREMENTS-061: Elements request the API (REQ-REQUIREMENTS-011)', async ({ page, context, ev }) => {
  // Precondition: a second console server of this checkout runs on a free port with project m and a confirmed mockup
  // holding an <img> and a <script src> that point at /api/projects/beads.
  const server = await startMockupServer();
  const lines = (from: string) => server.log().split('\n').filter((line) => line.includes(`"GET /api/projects/beads?from=${from} HTTP/1.1"`));
  const answered = (from: string, status: number) => lines(from).filter((line) => line.includes(`" ${status}`)).length;
  try {
    await ev.step('1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server', async () => {
      await page.goto(`${server.base}/requirements/mockups?project=m&mockup=ui%2F2026-11-22`);
      await expect(page.frameLocator('iframe').locator('#beads')).toHaveText('blocked');
    });

    await ev.step('2. Open the mockup file in its own tab', async () => {
      const href = await page.getByRole('link', { name: 'Open in a new tab' }).getAttribute('href');
      const own = await context.newPage();
      await own.goto(`${server.base}${href}`);
      await expect(own.locator('#beads')).toHaveText('blocked');
    });

    await ev.step('3. Read the server log', async () => {
      for (const from of ['img', 'script']) {
        await expect.poll(() => answered(from, 403)).toBe(2); // one from the frame, one from the tab
        expect(answered(from, 200)).toBe(0);
        expect(lines(from)).toHaveLength(2);
      }
    });
  } finally {
    await server.stop();
  }
});
