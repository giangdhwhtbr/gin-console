// TC: TC-OVERVIEW-032@9126b6bc
import { test, expect } from '../evidence';
import { overview, overviewProject, stubApi } from '../support/api';
import { signIn } from '../support/overview';

// Test data: a project name of 60 characters without a space.
const LONG = 'abcdefghij'.repeat(6);

test('TC-OVERVIEW-032: Narrow window (REQ-OVERVIEW-011)', async ({ page, ev }) => {
  // Precondition: the window is 360px wide; a blocked bead of a project with a 60-character name has a blocker, an assignee and a wait.
  await page.setViewportSize({ width: 360, height: 800 });
  await signIn(page);
  await stubApi(page, {
    projects: [LONG],
    overview: overview([
      overviewProject(LONG, {
        blocked: [{
          id: 't-3', title: 'Title t-3', assignee: 'ann@example.com', days: 4,
          blocker: { id: 't-8', title: 'Title t-8', person: 'bao', blocked: false },
        }],
      }),
    ]),
  });

  await ev.step('1. Open `/`', async () => {
    await page.goto('/');
    const row = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: /t-3/ }) });
    await expect(row).toBeVisible();
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await expect(row).toContainText(LONG);
    await expect(row).toContainText('ann');
    await expect(row).toContainText('waits 4 d');
    await expect(row.getByRole('link', { name: /t-8/ })).toBeVisible();
    await expect(row).toContainText('bao');
    const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
    await expect(links).toHaveText(['Overview', 'Beads', 'My work', 'Milestones', 'REQs (Requirements)', 'Reports'], { useInnerText: true });
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(await link.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
    }
  });
});
