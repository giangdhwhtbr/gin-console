// TC: TC-BEADS-072@d52a8e1b
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProjectPulls } from '../support/pull';

test('TC-BEADS-072: Same blocked number on Projects and in the Beads views', async ({ page, ev }) => {
  // Precondition: alpha has beads a, e, e.1, b, c, d: 4 blocked and 1 in progress.
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  const beads = [
    bead('a', { ready: true }),
    bead('e', { issue_type: 'epic', blocked: true, blocked_by: ['a'] }),
    bead('e.1', { parent: 'e', blocked: true, blocked_by: ['a'] }),
    bead('b', { status: 'blocked', blocked: true }),
    bead('c', { status: 'in_progress', blocked: true, blocked_by: ['a'] }),
    bead('d', { status: 'in_progress' }),
  ];
  await stubProjectPulls(
    page,
    [{ name: 'alpha', path: '/tmp/alpha', beads: { open: 2, in_progress: 1, blocked: 4, ready: 1, epics: [] } }],
    beads,
  );

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    await expect(page.getByRole('article', { name: 'alpha' }).getByText('blocked 4', { exact: true })).toBeVisible();
  });

  await ev.step('2. Open /beads?project=alpha&view=board', async () => {
    await page.goto('/beads?project=alpha&view=board');
    await expect(page.getByRole('region', { name: 'Blocked' }).getByRole('heading', { name: /^Blocked\s*4$/ })).toBeVisible();
  });

  await ev.step('3. Open /beads?project=alpha&view=focus', async () => {
    await page.goto('/beads?project=alpha&view=focus');
    await expect(page.getByRole('region', { name: 'Blocked' }).getByRole('heading', { name: /^Blocked\s*4$/ })).toBeVisible();
  });
});
