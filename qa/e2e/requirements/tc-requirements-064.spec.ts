// TC: TC-REQUIREMENTS-064@61bad995
import { test, expect } from '../evidence';
import { mockup, stubRequirements } from '../support/requirements';

const PAGE = `<!doctype html><title>m</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=X">
<link rel="stylesheet" href="style.css">
<h1 id="title">Own style</h1>
<img src="https://example.com/x.png">
<p id="inline" style="color: rgb(10, 20, 30)">Inline</p>`;

test('TC-REQUIREMENTS-064: Outside resources (REQ-REQUIREMENTS-011)', async ({ page, ev }) => {
  // Precondition: a confirmed folder ui 2026-11-22 holds mockup/index.html with an outside <img>, an outside stylesheet,
  // its own style.css and an inline style; the stubbed files carry the headers of the server.
  await stubRequirements(page, {
    projects: ['a'],
    mockups: { mockups: [mockup()] },
    files: {
      'mockup/index.html': { type: 'text/html; charset=utf-8', body: PAGE },
      'mockup/style.css': { type: 'text/css; charset=utf-8', body: '#title { color: rgb(200, 30, 60); }' },
    },
  });
  // Chromium reports a request its CSP blocks to `request` and then to `requestfailed`, so a request counts as
  // having left only when it was not refused: a route that answers 200 for the outside hosts makes it visible.
  const outside: string[] = [];
  const seen: string[] = [];
  const refused = new Set<string>();
  const isOutside = (url: string) => ['example.com', 'fonts.googleapis.com'].includes(new URL(url).hostname);
  await page.route((url) => isOutside(url.href), (route) => {
    outside.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
  });
  page.on('requestfailed', (request) => {
    if (isOutside(request.url())) refused.add(request.url());
  });
  page.on('request', (request) => {
    if (isOutside(request.url())) seen.push(request.url());
  });

  await ev.step('1. Record every request of the page', async () => {
    expect(outside).toEqual([]);
  });

  await ev.step('2. Open `/requirements/mockups?project=a&mockup=ui/2026-11-22`', async () => {
    await page.goto('/requirements/mockups?project=a&mockup=ui%2F2026-11-22');
    await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts');
  });

  await ev.step('3. Read the heading\'s colour in the frame', async () => {
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('#title')).toHaveCSS('color', 'rgb(200, 30, 60)');
    await expect(frame.locator('#inline')).toHaveCSS('color', 'rgb(10, 20, 30)');
    await page.waitForLoadState('networkidle');
    expect(outside).toEqual([]); // none reached the network
    for (const url of seen) expect(refused.has(url), `${url} was not blocked`).toBe(true);
  });
});
