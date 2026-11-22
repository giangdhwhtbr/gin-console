// TC: TC-UI-260@96470dd4
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubProjectPulls } from '../support/pull';

test('TC-UI-260: Board card and link', async ({ page, ev }) => {
  // Precondition: alpha has ready P1 bead t-1 assigned to alice.
  await stubProjectPulls(
    page,
    [{ name: 'alpha', path: '/tmp/alpha', beads: { open: 1, in_progress: 0, blocked: 0, ready: 1, epics: [] } }],
    [bead('t-1', { ready: true, priority: 1, assignee: 'alice', title: 'Card title', issue_type: 'bug' })],
  );

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('t-1');
    await expect(card).toContainText('bug');
    await expect(card).toContainText('P1');
    await expect(card).toContainText('Ready');
    await expect(card).toContainText('alice');
  });

  await ev.step('2. Click the title of `t-1`', async () => {
    await page.getByRole('link', { name: 'Card title' }).click();
    await expect(page).toHaveURL(/\/beads\/alpha\/t-1$/);
  });
});
