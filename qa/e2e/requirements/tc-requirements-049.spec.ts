// TC: TC-REQUIREMENTS-049@495ac211
import { test, expect } from '../evidence';
import { requirement, requirementList, signoff, stubRequirements, gone } from '../support/requirements';

test('TC-REQUIREMENTS-049: Scenarios fail (REQ-REQUIREMENTS-015)', async ({ page, ev }) => {
  // Precondition: the scenarios request answers 502.
  await stubRequirements(page, {
    projects: ['a'],
    list: requirementList([
      requirement('REQ-AUTH-001', {
        title: 'Lock out', status: 'untested', reasons: ['not run'],
        signoff: signoff({ state: 'current', actor: 'ba', at: '2026-11-20T10:00:00Z', change: 'e1-login', evidence: 'review' }),
        changes: [{ folder: 'e1-login', change: 'e1-login', epic: 'e-1', op: 'added', archived: null }],
        beads: [{ id: 'a-1', title: 'Lock the account', status: 'closed' }],
        cases: [{ id: 'TC-AUTH-001', effective_result: 'passed' }],
        tests: ['tests/auth.spec.ts'],
      }),
    ]),
    scenarios: gone('gin failed'),
  });

  await ev.step('1. Open `/requirements/matrix?project=a&req=REQ-AUTH-001`', async () => {
    await page.goto('/requirements/matrix?project=a&req=REQ-AUTH-001');
    const panel = page.getByRole('complementary', { name: 'REQ-AUTH-001' });
    await expect(panel.getByText('Scenarios could not be loaded')).toBeVisible();
    await expect(panel.getByRole('link', { name: /Lock the account/ })).toBeVisible();
    await expect(panel.getByText('TC-AUTH-001: passed')).toBeVisible();
  });
});
