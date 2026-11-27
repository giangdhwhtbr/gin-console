// TC: TC-REQUIREMENTS-037@12807b22
import { test, expect } from '../evidence';
import { startMockupServer } from '../support/mockup-server';

test('TC-REQUIREMENTS-037: Script calls the API (REQ-REQUIREMENTS-011)', async ({ page, context, ev }) => {
  // Precondition: a second console server of this checkout runs on a free port with project m and a confirmed mockup
  // whose script calls fetch('/api/projects/beads') and a no-cors POST to /api/refresh.
  const server = await startMockupServer();
  // lines of the access log that contain `needle`; those answered 403 are the refused requests, not the console's own
  const lines = (needle: string) => server.log().split('\n').filter((line) => line.includes(needle));
  const count = (needle: string) => lines(needle).filter((line) => !line.includes('" 403')).length;
  const refused = (from: string) => lines(`"GET /api/projects/beads?from=${from} HTTP/1.1"`).filter((line) => line.includes('" 403'));
  const reached = (from: string) => lines(`"GET /api/projects/beads?from=${from} HTTP/1.1" 200`);
  // with the query, so the <img> and <script src> requests (?from=...) are not taken for the mockup's fetch calls
  const seen = (request: import('@playwright/test').Request) => {
    const url = new URL(request.url());
    return `${request.method()} ${url.pathname}${url.search}`;
  };
  const fromFrames: string[] = [];
  page.on('request', (request) => {
    if (request.frame() !== page.mainFrame()) fromFrames.push(seen(request));
  });
  const fromTab: string[] = [];
  const beadsAtStart = count('GET /api/projects/beads');
  try {
    await ev.step('1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server', async () => {
      await page.goto(`${server.base}/requirements/mockups?project=m&mockup=ui%2F2026-11-22`);
      await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts');
      // the log works: the console itself asked for the projects
      expect(count('GET /api/projects/beads')).toBeGreaterThan(beadsAtStart);
    });

    await ev.step('2. Read the outcome the mockup shows in the frame', async () => {
      const frame = page.frameLocator('iframe');
      await expect(frame.locator('#beads')).toHaveText('blocked');
      await expect(frame.locator('#refresh')).toHaveText('blocked');
      // the listener works: the frame's own document was requested; the mockup's two calls were not
      expect(fromFrames).toContain('GET /api/requirements/mockups/m/files/ui/2026-11-22/index.html');
      expect(fromFrames.filter((r) => r.endsWith('/api/refresh') || r.endsWith('/api/projects/beads'))).toEqual([]);
      // the mockup's <img> and <script src> were answered 403 by the server and never 200 (REQ-SERVER-012)
      await expect.poll(() => refused('img').length).toBe(1);
      await expect.poll(() => refused('script').length).toBe(1);
      expect(reached('img')).toEqual([]);
      expect(reached('script')).toEqual([]);
    });

    const beadsBefore = count('GET /api/projects/beads');
    let own: import('@playwright/test').Page;
    await ev.step('3. Open the mockup file in its own tab', async () => {
      const href = await page.getByRole('link', { name: 'Open in a new tab' }).getAttribute('href');
      expect(href).toBe('/api/requirements/mockups/m/files/ui/2026-11-22/index.html');
      own = await context.newPage();
      own.on('request', (request) => fromTab.push(seen(request)));
      await own.goto(`${server.base}${href}`);
    });

    await ev.step('4. Read the outcome the mockup shows in that tab', async () => {
      await expect(own.locator('#beads')).toHaveText('blocked');
      await expect(own.locator('#refresh')).toHaveText('blocked');
    });

    await ev.step('5. Read the server log', async () => {
      await expect.poll(() => refused('img').length).toBe(2); // one from the frame, one from the tab
      await expect.poll(() => refused('script').length).toBe(2);
      expect(reached('img')).toEqual([]);
      expect(reached('script')).toEqual([]);
      expect(count('POST /api/refresh')).toBe(0);
      expect(count('GET /api/projects/beads')).toBe(beadsBefore);
      expect(fromTab).toContain('GET /api/requirements/mockups/m/files/ui/2026-11-22/index.html');
      expect(fromTab.filter((r) => r.endsWith('/api/refresh') || r.endsWith('/api/projects/beads'))).toEqual([]);
    });
  } finally {
    await server.stop();
  }
});
