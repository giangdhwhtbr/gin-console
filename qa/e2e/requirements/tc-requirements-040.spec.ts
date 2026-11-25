// TC: TC-REQUIREMENTS-040@229ac4f3
import { test, expect } from '../evidence';
import { changeRow, mockup, requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-040: Phone (REQ-REQUIREMENTS-012)', async ({ page, ev }) => {
  // Precondition: project a is configured.
  await stubRequirements(page, { projects: ['a'], list: requirementList([
      requirement('REQ-AUTH-001', { status: 'untested', reasons: ['no case'] }),
      requirement('REQ-AUTH-002', { status: 'failing', reasons: ['failed'] }),
      requirement('REQ-AUTH-003', { status: 'covered' }),
    ]), changes: { changes: [changeRow('e1-login')], error: null, cause: null }, mockups: { mockups: [mockup()] } });
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

  await ev.step('1. Set the window to 390px wide', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
  });

  await ev.step('2. Open `/requirements/changes?project=a`', async () => {
    await page.goto('/requirements/changes?project=a');
    const row = page.getByRole('navigation', { name: 'Requirement sections' });
    await expect(row.getByRole('link')).toHaveText(['Matrix 2', 'Changes 1', 'Mockups 1']);
    await expect(row.getByRole('link', { name: /^Changes/ })).toHaveAttribute('aria-current', 'page');
    expect(await sideways()).toBe(false);
  });

  await ev.step('3. Set the window to 360px wide', async () => {
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(page.getByRole('navigation', { name: 'Requirement sections' })).toBeVisible();
    expect(await sideways()).toBe(false);
  });
});
