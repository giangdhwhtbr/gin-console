// TC: TC-UI-091@b398ea7e
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

test('TC-UI-091: Back to the Board with its filters', async ({ page, ev }) => {
  // Precondition: project a with open beads.
  const a1 = bead('a-1', { ready: true });
  const a2 = bead('a-2', { ready: true });
  await stubApi(page, { projects: ['a'], beads: [a1, a2] });
  await stubDetails(page, { 'a-1': detailOf(a1), 'a-2': detailOf(a2) });

  await ev.step('1. Open /beads?project=a&view=board&status=open', async () => {
    await page.goto('/beads?project=a&view=board&status=open');
    await expect(page.getByRole('link', { name: /a-1/ }).first()).toBeVisible();
  });

  await ev.step('2. Open a card', async () => {
    await page.getByRole('link', { name: /a-1/ }).first().click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    await expect(page.getByRole('heading', { name: 'Title a-1' })).toBeVisible();
  });

  await ev.step('3. Use the first link of the breadcrumb', async () => {
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/beads\?/);
    const params = new URL(page.url()).searchParams;
    expect(params.get('view')).toBe('board');
    expect(params.get('status')).toBe('open');
    await expect(page.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Status 1' }).click();
    await expect(page.getByRole('checkbox', { name: 'open' })).toBeChecked();
  });
});
