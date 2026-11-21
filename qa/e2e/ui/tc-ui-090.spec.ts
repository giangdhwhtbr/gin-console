// TC: TC-UI-090@0912a2b0
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, milestoneOption, stubApi } from '../support/api';
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

test('TC-UI-090: From a milestone page', async ({ page, ev }) => {
  // Precondition: project a with milestone m2 and bead a-1 under it.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const a1 = bead('a-1', { milestone: 'm2', ready: true });
  await stubApi(page, {
    projects: ['a'],
    beads: [a1],
    milestoneOptions: { milestones: [milestoneOption('m2', { status: 'active' })], current: 'm2' },
    milestone: { m2: detail([epicPlan('a-1')], { id: 'm2', title: 'Checkout v2' }) },
  });
  await stubDetails(page, { 'a-1': detailOf(a1) });

  await ev.step('1. Open /milestones/a/m2?tab=beads&view=board&status=open', async () => {
    await page.goto('/milestones/a/m2?tab=beads&view=board&status=open');
    await expect(page.getByRole('link', { name: /a-1/ }).first()).toBeVisible();
  });

  await ev.step('2. Open the bead page of a-1', async () => {
    await page.getByRole('link', { name: /a-1/ }).first().click();
    await expect(page).toHaveURL(/\/beads\/a\/a-1$/);
    const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    const first = crumb.getByRole('listitem').first();
    await expect(first).toHaveText('Checkout v2 › Board · 1 filter');
    await expect(first.getByRole('link')).toHaveAttribute('href', '/milestones/a/m2?tab=beads&view=board&status=open');
    await expect(crumb.getByRole('listitem').nth(1)).toContainText('Title a-1');
  });
});
