// TC: TC-UI-379@a65ad3fc
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

test('TC-UI-379: Show closed and the milestone', async ({ page, ev }) => {
  // Precondition: project a has the current milestone m1 and the bead a-1 titled "Fix login".
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  // kind is a field of the list answer that `BeadSummary` of the support builders does not declare.
  const a1 = { ...bead('a-1', { title: 'Fix login', ready: true }), kind: 'technical' };
  await stubApi(page, {
    projects: ['a'],
    beads: [a1],
    milestoneOptions: { milestones: [milestoneOption('m1', { status: 'active' })], current: 'm1' },
  });
  const detail = { ...a1, description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [], bugs: [] };
  await page.route('**/api/beads/a/a-1**', (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: url.pathname.endsWith('/comments') ? [] : detail });
  });
  const place = '/beads?project=a&view=list&closed=1&milestone=all&kind=technical';

  await ev.step('1. Open `/beads?project=a&view=list&closed=1&milestone=all&kind=technical`', async () => {
    await page.goto(place);
    await expect(page.getByRole('link', { name: 'Fix login' })).toBeVisible();
  });

  await ev.step('2. Open the bead page of `a-1`', async () => {
    await page.getByRole('link', { name: 'Fix login' }).click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    const first = crumb.getByRole('link', { name: 'Beads › List, 2 filters' });
    await expect(first).toBeVisible();
    const href = new URL((await first.getAttribute('href')) ?? '', 'http://x');
    // the List view is the default, so the app leaves `view=list` out of the link
    expect(href.pathname).toBe('/beads');
    expect(Object.fromEntries(href.searchParams)).toEqual({ project: 'a', closed: '1', milestone: 'all', kind: 'technical' });
    await expect(crumb.locator('[aria-current="page"]')).toHaveText('Fix login');
  });
});
