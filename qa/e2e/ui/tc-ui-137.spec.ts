// TC: TC-UI-137@9b06c794
// TC: TC-UI-137@x
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { mainNav } from '../support/shell';

test('TC-UI-137: Refresh on the Beads page (REQ-UI-096)', async ({ page, ev }) => {
  // Precondition: project a is configured with one bead.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const stub = await stubApi(page, { projects: ['a'], beads: [bead('a-1', { title: 'Fix it' })] });
  await page.route('**/api/refresh', (route) => route.fulfill({ json: { ok: true } }));
  const requests: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/api/refresh' || u.pathname === '/api/beads') requests.push(`${r.method()} ${u.pathname}`);
  });
  await page.goto('/beads?project=a');
  await expect(page.getByText('Fix it').first()).toBeVisible();
  requests.length = 0;

  await ev.step('2. Activate "Refresh data"', async () => {
    await page.getByRole('button', { name: 'Refresh data' }).click();
    await expect.poll(() => requests.includes('GET /api/beads')).toBe(true);
    expect(requests[0]).toBe('POST /api/refresh');
    expect(requests.indexOf('GET /api/beads')).toBeGreaterThan(requests.indexOf('POST /api/refresh'));
    await expect(page).toHaveURL((u) => u.pathname + u.search === '/beads?project=a');
    expect(stub.calls.length).toBeGreaterThan(0);
  });
});
