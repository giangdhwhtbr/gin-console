// TC: TC-REQUIREMENTS-053@11fad164
import { test, expect } from '../evidence';
import { changeContent, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-053: Missing plan (REQ-REQUIREMENTS-017)', async ({ page, ev }) => {
  // Precondition: a change has a proposal and a spec delta and no plan.
  await stubRequirements(page, {
    projects: ['a'],
    change: { 'e1-login': changeContent('e1-login', { proposal: '# Proposal text', 'spec-delta': '# Delta text' }) },
  });

  await ev.step('1. Open `/requirements/changes/e1-login?project=a`', async () => {
    await page.goto('/requirements/changes/e1-login?project=a');
    const tabs = page.getByRole('navigation', { name: 'Change documents' });
    await expect(tabs.getByRole('link')).toHaveText(['Proposal', 'Spec delta']);
    await expect(tabs.getByRole('link', { name: 'Plan' })).toHaveCount(0);
  });
});
