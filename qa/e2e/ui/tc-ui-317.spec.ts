// TC: TC-UI-317@5543c1f0
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-317: Controls keep their pills', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, { beads: [bead('a-1', { title: 'Open bead' }), bead('a-2', { title: 'Closed bead', status: 'closed', closed_at: '2026-10-09T00:00:00Z' })] });

  await ev.step('1. Open `/beads?project=P&view=list&status=open`', async () => {
    await page.goto('/beads?project=P&view=list&status=open');
    await expect(page.getByRole('link', { name: 'Open bead' })).toBeVisible();
  });

  await ev.step('2. Find the Status filter control', async () => {
    const status = page.getByRole('button', { name: 'Status 1' });
    await expect(status).toBeVisible();
    const pill = status.getByText('1', { exact: true });
    await expect(pill).toBeVisible();
    await expect(pill).toHaveCSS('background-color', 'rgb(244, 240, 252)');
  });
});
