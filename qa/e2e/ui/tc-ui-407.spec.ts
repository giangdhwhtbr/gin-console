// TC: TC-UI-407@9875dd17
import { test, expect } from '../evidence';
import {  } from '../support/api';
import { changeContent, stubRequirements } from '../support/requirements';
import {  } from '../support/shell';

test('TC-UI-407: Requirements section title (REQ-UI-063)', async ({ page, ev }) => {
  // Precondition: project example is configured and has the change e1-login.
  await stubRequirements(page, {
    projects: ['example'],
    change: { 'e1-login': changeContent('e1-login', { proposal: '# Proposal text' }) },
  });

  await ev.step('1. Open `/requirements/changes?project=example`', async () => {
    await page.goto('/requirements/changes?project=example');
    await expect(page.getByRole('heading', { name: 'Requirements', level: 1 })).toBeVisible();
    await expect(page).toHaveTitle('Requirements · Changes · example · gin-console');
  });

  await ev.step('2. Open `/requirements/changes/e1-login?project=example`', async () => {
    await page.goto('/requirements/changes/e1-login?project=example');
    await expect(page.getByRole('heading', { name: 'Proposal text' })).toBeVisible();
    await expect(page).toHaveTitle('e1-login · example · gin-console');
  });
});
