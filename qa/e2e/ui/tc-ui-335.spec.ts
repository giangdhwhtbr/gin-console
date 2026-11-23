// TC: TC-UI-335@33a5d119
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

test('TC-UI-335: Phone sheet content and order (REQ-UI-084)', async ({ page, ev }) => {
  // Precondition: project example at 390px, ?project=example&status=open; the beads have capabilities and sprint:<name> labels.
  await page.setViewportSize({ width: 390, height: 844 });
  await stubApi(page, {
    projects: ['example'],
    milestoneOptions: options,
    beads: [
      { ...bead('ex-1', { title: 'Pay invoice', milestone: 'ex-m2', labels: ['sprint:s1', 'ui'], assignee: 'alice' }), capabilities: ['checkout'] },
      { ...bead('ex-2', { title: 'Ship cart', milestone: 'ex-m2', labels: ['sprint:s2'] }), capabilities: ['cart'] },
    ],
  });

  await ev.step('1. Click `button "Filters"`', async () => {
    await page.goto('/beads?project=example&status=open');
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    await page.getByRole('button', { name: /^Filters\b/ }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    const names = await sheet.locator('[role=group][data-filter]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(names).toEqual(['Milestone', 'Status', 'Assignee', 'Priority', 'Labels', 'Type', 'Kind', 'Capability', 'Sprint']);
    await expect(sheet.getByRole('switch', { name: 'Show closed' })).toHaveCount(0);
    await expect(sheet.getByText('Show closed')).toHaveCount(0);
    const clear = sheet.getByRole('button', { name: 'Clear filters' });
    await expect(clear).toBeVisible();
    const last = (await sheet.locator('[role=group][data-filter]').last().boundingBox())!;
    const clearBox = (await clear.boundingBox())!;
    expect(clearBox.y).toBeGreaterThanOrEqual(last.y + last.height);
  });
});
