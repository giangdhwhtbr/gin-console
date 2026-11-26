// TC: TC-REQUIREMENTS-039@0da505a9
import { test, expect } from '../evidence';
import { changeRow, mockup, requirement, requirementList, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-039: Wide (REQ-REQUIREMENTS-012)', async ({ page, ev }) => {
  // Precondition: project a is configured; the window is 1440px wide and the sidebar is expanded.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([
      requirement('REQ-AUTH-001', { status: 'untested', reasons: ['no case'] }),
      requirement('REQ-AUTH-002', { status: 'failing', reasons: ['failed'] }),
      requirement('REQ-AUTH-003', { status: 'covered' }),
    ]),
    changes: { changes: [changeRow('e1-login'), changeRow('2026-10-01-old', { archived: '2026-10-01' })], error: null, cause: null },
    mockups: { mockups: [mockup()] },
  });

  await ev.step('1. Open `/requirements/changes?project=a`', async () => {
    await page.goto('/requirements/changes?project=a');
    const sections = page.getByRole('list', { name: 'Requirement sections' });
    await expect(sections.getByRole('link')).toHaveText(['Matrix 2', 'Changes 1', 'Mockups 1']);
    await expect(sections.getByRole('link', { name: /^Changes/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Requirement sections' })).toHaveCount(0);
  });
});
