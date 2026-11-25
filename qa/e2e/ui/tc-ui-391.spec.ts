// TC: TC-UI-391@f9607220
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-391: My work table in a wide window (REQ-UI-153)', async ({ page, ev }) => {
  // Preconditions: window 1024px wide; email ann@x.com; ready task t-1 "Set up CI" assigned to ann.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, { beads: [bead('t-1', { title: 'Set up CI', ready: true, assignee: 'ann' })] });

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: /Set up CI/ }) });
    await expect(row).toContainText('t-1');
    await expect(row).toContainText('Ready');
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(0);
  });
});
