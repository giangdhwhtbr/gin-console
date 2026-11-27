// TC: TC-UI-417@07707b05
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-417: No indicator for a count of 0 (REQ-UI-066)', async ({ page, ev }) => {
  // Precondition: task t-1 of project alpha with comment_count 0, dependency_count 0 and image_count 0.
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('t-1', { ready: true, title: 'Card title', comment_count: 0, dependency_count: 0, image_count: 0 })],
  });

  await ev.step('1. Open `/beads?project=alpha&milestone=all&view=board`', async () => {
    await page.goto('/beads?project=alpha&milestone=all&view=board');
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card title' }) });
    await expect(card).toBeVisible();
    await expect(card.getByRole('img', { name: /comment|dependenc|image/ })).toHaveCount(0);
    await expect(page.getByText(/0 (comments|deps|images)/)).toHaveCount(0);
  });
});
