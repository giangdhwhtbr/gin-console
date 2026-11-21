// TC: TC-UI-086@ea641009
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-086: Place and filters', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, { projects: ['a'], beads: [bead('a-1', { title: 'Fix login', ready: true })] });
  const detail = { ...bead('a-1', { title: 'Fix login', ready: true }), description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] };
  await page.route('**/api/beads/a/a-1**', (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: url.pathname.endsWith('/comments') ? [] : detail });
  });

  await ev.step('1. Open /beads?project=a&view=board&status=open&q=fix', async () => {
    await page.goto('/beads?project=a&view=board&status=open&q=fix');
    await expect(page.getByRole('heading', { name: /^Backlog/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fix login' })).toBeVisible();
  });

  await ev.step('2. Open the bead page of a-1', async () => {
    await page.getByRole('link', { name: 'Fix login' }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    const first = crumb.getByRole('link', { name: 'Beads › Board · 2 filters' });
    await expect(first).toBeVisible();
    const href = new URL((await first.getAttribute('href')) ?? '', 'http://x');
    expect(href.pathname).toBe('/beads');
    expect(Object.fromEntries(href.searchParams)).toEqual({ project: 'a', view: 'board', status: 'open', q: 'fix' });
    await expect(crumb.locator('[aria-current="page"]')).toHaveText('Fix login');
  });
});
