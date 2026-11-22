// TC: TC-UI-276@90b4892f
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProjectPulls } from '../support/pull';

test('TC-UI-276: Dependency indicator tooltip', async ({ page, ev }) => {
  // Precondition: alpha has task t-1 with 2 dependencies.
  await stubProjectPulls(
    page,
    [{ name: 'alpha', path: '/tmp/alpha', beads: { open: 1, in_progress: 0, blocked: 0, ready: 1, epics: [] } }],
    [bead('t-1', { ready: true, title: 'Card title', dependency_count: 2 })],
  );

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    await expect(page.getByRole('link', { name: 'Card title' })).toBeVisible();
  });

  await ev.step('2. Rest the pointer on the dependency indicator 2 of the card of `t-1`', async () => {
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    const indicator = card.getByRole('img', { name: '2 dependencies' });
    await indicator.hover();
    await expect(page.getByRole('tooltip')).toContainText('how many beads this bead depends on');
    await expect(indicator).not.toHaveAttribute('title', /.*/);
  });
});
