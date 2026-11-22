// TC: TC-UI-297@a7613277
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-UI-297: Milestone status uses the state glyphs', async ({ page, ev }) => {
  // Precondition: P reports milestone M1 (active) and M2 (planned).
  await stubApi(page, {
    projects: ['P'],
    milestones: list([
      entry('M1', { title: 'Alpha launch', status: 'active' }),
      entry('M2', { title: 'Beta launch', status: 'planned' }),
    ]),
  });

  await ev.step('1. Open `/milestones?project=P`', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('list', { name: 'Milestones' }).getByRole('listitem')).toHaveCount(2);
  });

  const rowOf = (title: string) => page.getByRole('list', { name: 'Milestones' }).getByRole('listitem').filter({ hasText: title });

  await ev.step('2. Read the status of the row of `M1`', async () => {
    const status = rowOf('Alpha launch').locator('[data-status="active"]');
    await expect(status).toHaveText('Active');
    const glyph = status.locator('svg[data-glyph="in_progress"]');
    await expect(glyph).toBeVisible();
    await expect(glyph.locator('path')).toHaveCount(1); // the half disc
  });

  await ev.step('3. Read the status of the row of `M2`', async () => {
    const status = rowOf('Beta launch').locator('[data-status="planned"]');
    await expect(status).toHaveText('Planned');
    const glyph = status.locator('svg[data-glyph="deferred"]');
    await expect(glyph).toBeVisible();
    await expect(glyph.locator('circle')).toHaveAttribute('stroke-dasharray', /\d/); // the dashed ring
  });
});
