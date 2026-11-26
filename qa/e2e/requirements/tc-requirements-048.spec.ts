// TC: TC-REQUIREMENTS-048@6aa4d5ea
import { test, expect } from '../evidence';
import { requirement, requirementList, signoff, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-048: Shared link (REQ-REQUIREMENTS-015)', async ({ page, ev }) => {
  // Precondition: REQ-AUTH-001 has two scenarios, a change, a bead, a case, a test file and a sign-off by ba.
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
    scenarios: {
      'REQ-AUTH-001': { id: 'REQ-AUTH-001', title: 'Lock out', source: 'spec.md', scenarios: [
        { title: 'Five failures', given: ['a user'], when: ['five wrong passwords'], then: ['the account locks'] },
        { title: 'Reset', given: [], when: ['an hour passes'], then: ['it unlocks'] },
      ] },
    },
  });

  await ev.step('1. Open `/requirements/matrix?project=a&req=REQ-AUTH-001`', async () => {
    await page.goto('/requirements/matrix?project=a&req=REQ-AUTH-001');
    const panel = page.getByRole('complementary', { name: 'REQ-AUTH-001' });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Five failures')).toBeVisible();
    await expect(panel.getByText('Given a user')).toBeVisible();
    await expect(panel.getByText('Then the account locks')).toBeVisible();
    await expect(panel.getByText('Reset', { exact: true })).toBeVisible();
    await expect(panel.getByText('ba', { exact: true })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'e1-login' })).toHaveAttribute('href', '/requirements/changes/e1-login?project=a');
    await expect(panel.getByRole('link', { name: /Lock the account/ })).toHaveAttribute('href', '/beads/a/a-1');
    await expect(panel.getByText('TC-AUTH-001: passed')).toBeVisible();
    await expect(panel.getByText('tests/auth.spec.ts')).toBeVisible();
  });
});
