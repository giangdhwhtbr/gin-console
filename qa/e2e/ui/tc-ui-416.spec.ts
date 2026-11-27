// TC: TC-UI-416@bbdfb163
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-416: Comment indicator (REQ-UI-066)', async ({ page, ev }) => {
  // Precondition: task t-1 of project alpha with comment_count 3.
  await stubApi(page, { projects: ['alpha'], beads: [bead('t-1', { ready: true, title: 'Card title', comment_count: 3 })] });

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    const indicator = card.getByRole('img', { name: '3 comments' });
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('3');
  });
});
