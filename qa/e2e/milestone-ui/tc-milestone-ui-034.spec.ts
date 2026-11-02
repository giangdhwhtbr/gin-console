// TC: TC-MILESTONE-UI-034@efd8e52b
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-MILESTONE-UI-034: Focus view hides the milestone', async ({ page, ev }) => {
  // Precondition: P reports open milestone M1 and open epic A, child of M1. Both are in progress,
  // so the Focus "In flight" column would show M1 if it were not left out.
  await stubApi(page, {
    beads: [
      bead('M1', { title: 'Beta readiness', issue_type: 'milestone', status: 'in_progress' }),
      bead('A', { title: 'Epic Alpha', issue_type: 'epic', status: 'in_progress', parent: 'M1' }),
    ],
  });

  await ev.step('1. Open /beads?project=P', async () => {
    await page.goto('/beads?project=P');
    await expect(page.getByRole('navigation', { name: 'View' })).toBeVisible();
  });

  await ev.step('2. Choose the "Focus" view', async () => {
    await page.getByRole('navigation', { name: 'View' }).getByRole('button', { name: 'Focus' }).click();
    await expect(page.getByRole('button', { name: 'Focus' })).toHaveAttribute('aria-pressed', 'true');
    const main = page.getByRole('main');
    const inFlight = main.getByRole('region', { name: 'In flight' });
    await expect(inFlight.getByRole('listitem')).toHaveCount(1);
    const a = inFlight.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Epic Alpha' }) });
    await expect(a).toBeVisible();
    // A has no parent row or label: its card names neither M1 nor its title.
    await expect(a).not.toContainText('M1');
    await expect(a).not.toContainText('Beta readiness');
    for (const column of ['In flight', 'Blocked', 'Next up']) {
      await expect(main.getByRole('region', { name: column }).getByText('M1', { exact: true })).toHaveCount(0);
    }
    await expect(main.getByRole('link', { name: 'Beta readiness' })).toHaveCount(0);
  });
});
