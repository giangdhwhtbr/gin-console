// TC: TC-MILESTONE-UI-069@8735e752
import { test, expect } from '../evidence';
import { bead, detail, epicPlan, stubApi } from '../support/api';

test('TC-MILESTONE-UI-069: View and filters in the URL', async ({ page, ev }) => {
  // Precondition: the Beads tab of milestone m2 of project p is shown; m2 has an open and an in-progress epic.
  await stubApi(page, {
    projects: ['p'],
    milestone: { m2: detail([epicPlan('e1'), epicPlan('e2')], { id: 'm2' }) },
    beads: [
      bead('e1', { issue_type: 'epic', parent: 'm2', milestone: 'm2', status: 'open' }),
      bead('e2', { issue_type: 'epic', parent: 'm2', milestone: 'm2', status: 'in_progress' }),
    ],
  });
  const views = page.getByRole('navigation', { name: 'View' });
  // The app writes the same parameters in its own order (status before view); compare them as a set.
  const where = () => {
    const url = new URL(page.url());
    return `${url.pathname}?${[...url.searchParams].map(([k, v]) => `${k}=${v}`).sort().join('&')}`;
  };

  await ev.step('1. Open /milestones/p/m2?tab=beads', async () => {
    await page.goto('/milestones/p/m2?tab=beads');
    await expect(views.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
  });

  await ev.step('2. Choose Board in the views', async () => {
    await views.getByRole('button', { name: 'Board' }).click();
    await expect(views.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(where).toBe('/milestones/p/m2?tab=beads&view=board');
  });

  await ev.step('3. Open `button "Status"` and choose the status "open"', async () => {
    await page.getByRole('button', { name: 'Status', exact: true }).click();
    await page.getByRole('checkbox', { name: 'open', exact: true }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Status open', exact: true })).toBeVisible();
    await expect.poll(where).toBe('/milestones/p/m2?status=open&tab=beads&view=board');
  });

  await ev.step('4. Reload the page', async () => {
    await page.reload();
    await expect.poll(where).toBe('/milestones/p/m2?status=open&tab=beads&view=board');
    await expect(views.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Status open', exact: true })).toBeVisible();
    await expect(page.getByText('1 of 2', { exact: true })).toBeVisible();
  });
});
