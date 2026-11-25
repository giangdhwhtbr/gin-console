// TC: TC-UI-390@e5adee9a
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-390: My work cards on a phone (REQ-UI-153)', async ({ page, ev }) => {
  // Preconditions: window 390px wide; email ann@x.com; ready P2 task t-1 "Set up CI" assigned to ann.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'ann@x.com'));
  await stubApi(page, { beads: [bead('t-1', { title: 'Set up CI', ready: true, assignee: 'ann', priority: 2 })] });

  await ev.step('1. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Set up CI' }) });
    await expect(card).toContainText('t-1');
    await expect(card).toContainText('P2');
    await expect(card).toContainText('Ready');
    await expect(page.getByRole('table')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
