// TC: TC-UI-089@87caed29
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

test('TC-UI-089: Details panel', async ({ page, ev }) => {
  // Precondition: project a with bead a-1.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const a1 = bead('a-1');
  await stubApi(page, { projects: ['a'], beads: [a1] });
  await stubDetails(page, { 'a-1': detailOf(a1) });

  await ev.step('1. Open /beads?project=a', async () => {
    await page.goto('/beads?project=a');
    await expect(page.getByText('Title a-1')).toBeVisible();
  });

  await ev.step('2. Select a-1 in the List view', async () => {
    const row = page.getByRole('treeitem', { name: /a-1/ });
    const box = await row.boundingBox();
    await row.click({ position: { x: box!.width - 12, y: box!.height / 2 } });
    await expect(row).toHaveAttribute('aria-selected', 'true');
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Title a-1' })).toBeVisible();
    await expect(panel.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
    await expect(panel.getByRole('link', { name: 'Open page' })).toHaveAttribute('href', '/beads/a/a-1');
  });
});
