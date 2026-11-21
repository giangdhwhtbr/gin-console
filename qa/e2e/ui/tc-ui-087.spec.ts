// TC: TC-UI-087@22f8731e
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';
import { detailOf } from '../support/shell';
import type { Page } from '@playwright/test';

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

test('TC-UI-087: Parent', async ({ page, ev }) => {
  // Precondition: project a with bead a-1 and its child a-2.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const a1 = bead('a-1', { title: 'Checkout' });
  const a2 = bead('a-2', { parent: 'a-1' });
  await stubApi(page, { projects: ['a'], beads: [a1, a2] });
  await stubDetails(page, { 'a-1': detailOf(a1), 'a-2': detailOf(a2, a1) });

  await ev.step('1. Open the bead page of a-2', async () => {
    await page.goto('/beads/a/a-2');
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    const parent = crumb.getByRole('link', { name: 'Checkout' });
    await expect(parent).toHaveAttribute('href', '/beads/a/a-1');
    await expect(crumb.locator('[aria-current="page"]')).toHaveText('Title a-2');
    const items = crumb.getByRole('listitem');
    await expect(items.nth(1)).toContainText('Checkout');
    await expect(items.nth(2)).toContainText('Title a-2');
  });
});
