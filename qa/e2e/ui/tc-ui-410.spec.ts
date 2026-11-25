// TC: TC-UI-410@d68afbc5
import { test, expect } from '../evidence';
import {  } from '../support/api';
import { requirement, requirementList, stubRequirements } from '../support/requirements';
import {  } from '../support/shell';

test('TC-UI-410: Requirements query (REQ-UI-126)', async ({ page, ev }) => {
  // Precondition: projects a and b are configured.
  await stubRequirements(page, { projects: ['a', 'b'], list: requirementList([requirement('REQ-AUTH-001')]) });

  await ev.step('1. Open `/requirements/matrix?project=zzz`', async () => {
    await page.goto('/requirements/matrix?project=zzz');
    const notice = page.getByRole('status').filter({ hasText: 'No project zzz is configured' });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole('link', { name: 'a', exact: true })).toHaveAttribute('href', '/requirements/matrix?project=a');
    await expect(notice.getByRole('link', { name: 'b', exact: true })).toHaveAttribute('href', '/requirements/matrix?project=b');
    await expect(page.getByRole('table')).toHaveCount(0);
  });
});
