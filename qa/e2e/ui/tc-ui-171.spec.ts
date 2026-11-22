// TC: TC-UI-171@0736f1cf
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';
import { E12, e12, milestoneOptions, stubDetails } from '../support/lanes';

const TRACK = `${E12}.2`;

test('TC-UI-171: Lane chip in every view', async ({ page, ev }) => {
  // Precondition: track 2 of ex-e12 is ex-e12.2, in lane be and labelled lane:be and track:2; milestone ex-m2 holds ex-e12.
  const beads = e12();
  await stubApi(page, {
    projects: ['example'],
    beads,
    milestoneOptions,
    milestone: { 'ex-m2': detail([epicPlan(E12, { title: 'Team checkout' })], { id: 'ex-m2', title: 'Beta readiness' }) },
  });
  await stubDetails(page, beads);
  await page.setViewportSize({ width: 1440, height: 900 });
  const noLabelChip = async () => {
    await expect(page.getByText('lane:be')).toHaveCount(0);
    await expect(page.getByText('track:2', { exact: true })).toHaveCount(0);
  };

  await ev.step('1. Open /beads?project=example&milestone=all&view=list&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&milestone=all&view=list&scope=ex-e12');
    const row = page.locator(`[data-id="${TRACK}"]`);
    // the List draws the epic's tracks under it once the epic is opened
    if (!(await row.isVisible())) await page.getByRole('button', { name: `Expand ${E12}` }).click();
    await expect(row).toBeVisible();
    await expect(row.locator('[data-hint^="Lane be"]')).toHaveText('be');
    await noLabelChip();
  });

  await ev.step('2. Open /beads?project=example&milestone=all&view=board&scope=ex-e12', async () => {
    await page.goto('/beads?project=example&milestone=all&view=board&scope=ex-e12');
    const card = page.locator('[data-card]').filter({ hasText: 'Track 2' });
    await expect(card).toHaveCount(1);
    await expect(card.locator('[data-hint^="Lane be"]')).toHaveText('be');
    await noLabelChip();
  });

  await ev.step('3. Open /milestones/example/ex-m2?tab=gantt', async () => {
    await page.goto('/milestones/example/ex-m2?tab=gantt');
    await expect(page.getByRole('button', { name: /^Show \d+ child beads? of ex-e12$/ })).toBeVisible();
  });

  await ev.step('4. Click the expand button of ex-e12', async () => {
    await page.getByRole('button', { name: /^Show \d+ child beads? of ex-e12$/ }).click();
    const child = page.locator(`[data-child="${TRACK}"]`);
    await expect(child).toBeVisible();
    await expect(child.locator('[data-hint^="Lane be"]')).toHaveText('be');
    await noLabelChip();
  });

  await ev.step('5. Open /beads/example/ex-e12.2', async () => {
    await page.goto(`/beads/example/${TRACK}`);
    await expect(page.getByRole('heading', { name: 'Track 2' })).toBeVisible();
    await expect(page.getByRole('main').locator('[data-hint^="Lane be"]').first()).toHaveText('be');
    await noLabelChip();
  });
});
