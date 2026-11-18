// TC: TC-UI-088@dfb68797
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import type { Page } from '@playwright/test';

const detailOf = (b: ReturnType<typeof bead>) => ({
  ...b, kind: null, capabilities: [], complexity: null, estimate_minutes: null, description: 'A description',
  design: null, notes: null, acceptance_criteria: null, close_reason: null,
  dependencies: [], dependents: [], children: [], bugs: [],
});

async function stubDetails(page: Page, details: Record<string, ReturnType<typeof detailOf>>) {
  await page.route(/\/api\/beads\/a\/[^/?]+(\/comments)?(\?.*)?$/, async (route) => {
    const path = new URL(route.request().url()).pathname.split('/');
    const comments = path[path.length - 1] === 'comments';
    const id = decodeURIComponent(comments ? path[path.length - 2] : path[path.length - 1]);
    if (comments) return route.fulfill({ json: [] });
    const d = details[id];
    return d ? route.fulfill({ json: d }) : route.fulfill({ status: 404, json: { error: 'not found' } });
  });
}

test('TC-UI-088: No remembered place', async ({ page, ev }) => {
  // Precondition: project a with bead a-1; a fresh browser context has no remembered Beads place.
  const a1 = bead('a-1');
  await stubApi(page, { projects: ['a'], beads: [a1] });
  await stubDetails(page, { 'a-1': detailOf(a1) });

  await ev.step('1. Open the bead page of a-1 directly in a new tab', async () => {
    await page.goto('/beads/a/a-1');
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    const items = crumb.getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveText('Beads');
    await expect(items.nth(1)).toContainText('a-1');
    await expect(crumb.getByRole('link', { name: 'Beads' })).toHaveAttribute('href', '/beads?project=a');
  });
});
