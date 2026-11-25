// TC: TC-UI-388@8d633788
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';

test('TC-UI-388: Blocked by on the bead header (REQ-UI-152)', async ({ page, ev }) => {
  // Preconditions: email ann@x.com; t-1 is blocked by open t-2 "Set up CI" and open t-3 "Design tokens"; closed t-4 also blocked it.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  const t1 = bead('t-1', { title: 'Build checkout', blocked: true, blocked_by: ['t-2', 't-3'] });
  const others = [
    bead('t-2', { title: 'Set up CI' }),
    bead('t-3', { title: 'Design tokens' }),
    bead('t-4', { title: 'Old blocker', status: 'closed', closed_at: '2026-10-11T00:00:00Z' }),
  ];
  await stubApi(page, { beads: [t1, ...others] });
  await stubBeadDetails(page, 'P', [
    beadDetail(t1, {
      dependencies: [
        { id: 't-2', title: 'Set up CI', status: 'open', type: 'blocks' },
        { id: 't-3', title: 'Design tokens', status: 'open', type: 'blocks' },
        { id: 't-4', title: 'Old blocker', status: 'closed', type: 'blocks' },
      ],
    }),
    ...others.map((b) => beadDetail(b)),
  ]);

  await ev.step('1. Open `/beads/P/t-1`', async () => {
    await page.goto('/beads/P/t-1');
    await expect(page.getByRole('heading', { name: 'Build checkout', level: 1 })).toBeVisible();
    await expect(page.getByText('Blocked by Set up CI, Design tokens', { exact: true })).toBeVisible();
  });
  await ev.step('2. Click the "Set up CI" link of the "Blocked by" line', async () => {
    await page.getByRole('link', { name: 'Set up CI' }).click();
    await expect(page).toHaveURL((u) => u.pathname === '/beads/P/t-2');
    await expect(page.getByRole('heading', { name: 'Set up CI', level: 1 })).toBeVisible();
  });
});
