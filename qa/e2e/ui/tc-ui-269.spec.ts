// TC: TC-UI-269@1c874f92
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-269: Old assignee link with an email', async ({ page, ev }) => {
  // Precondition: alpha has a bead assigned to alice and one assigned to alice@example.com.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('a-1', { title: 'Handle bead', assignee: 'alice' }),
      bead('a-2', { title: 'Email bead', assignee: 'alice@example.com' }),
    ],
  });

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=list&assignee=alice%40example.com`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=list&assignee=alice%40example.com');
    await expect(page.getByRole('link', { name: 'Handle bead' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Email bead' })).toBeVisible();
    await page.getByRole('button', { name: /^Assignee/ }).click();
    await expect(page.getByRole('checkbox', { name: 'alice', exact: true })).toBeChecked();
  });
});
