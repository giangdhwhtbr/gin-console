// TC: TC-MILESTONE-UI-039@cee37f76
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test('TC-MILESTONE-UI-039: Beads failure stays in the section and Retry refetches', async ({ page, ev }) => {
  // Precondition: P's milestones load; GET /api/beads responds 502.
  const stub = await stubApi(page, {
    milestones: list([entry('M1', { title: 'Alpha launch' })]),
    beads: () => ({ status: 502, body: { error: 'bd failed' } }),
  });
  const section = page.getByRole('region', { name: 'Epics not in a milestone' });

  await ev.step('1. Open /milestones?project=P', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('list', { name: 'Milestones' }).getByRole('link', { name: 'Alpha launch' })).toBeVisible();
    await expect(section.getByText("Epics couldn't be loaded")).toBeVisible();
    await expect(section.getByText('bd failed')).toBeVisible();
    await expect(section.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  await ev.step('2. Click "Retry" in the section', async () => {
    const beadsCalls = () => stub.calls.filter((u) => u.pathname === '/api/beads').length;
    const before = beadsCalls();
    await section.getByRole('button', { name: 'Retry' }).click();
    await expect.poll(beadsCalls).toBeGreaterThan(before);
    // The refetch fails again: the error and Retry come back inside the section.
    await expect(section.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Milestones' }).getByRole('link', { name: 'Alpha launch' })).toBeVisible();
  });
});
