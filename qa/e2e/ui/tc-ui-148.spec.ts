// TC: TC-UI-148@3030b528
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { stubBeadWithImages } from '../support/images';

test.use({ timezoneId: 'UTC' });

test('TC-UI-148: Badges and facts (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: in-progress P1 epic e-3 of project alpha with points 5, points_reason, owner lead@example.com, assignee bao, created by lead,
  // created and updated at 2026-05-11 16:00:00, 0 comments; the browser date is in 2026.
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00Z'));
  await stubBeadWithImages(
    page, 'alpha',
    bead('e-3', {
      issue_type: 'epic', status: 'in_progress', priority: 1, owner: 'lead@example.com', assignee: 'bao', created_by: 'lead',
      created_at: '2026-05-11T16:00:00Z', updated_at: '2026-05-11T16:00:00Z', comment_count: 0,
    }),
    [],
    { detail: { points: 5, points_reason: 'new endpoint and UI' } },
  );
  const fact = (label: string) => page.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');

  await ev.step('1. Open `/beads/alpha/e-3`', async () => {
    await page.goto('/beads/alpha/e-3');
    const header = page.getByRole('heading', { name: 'Title e-3' }).locator('xpath=..');
    for (const text of ['In progress', 'P1', '5 pt']) {
      const mark = header.getByText(text, { exact: true });
      await expect(mark).toBeVisible();
      await expect(mark).toHaveCSS('border-top-width', '0px');
      await expect(mark).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
    await expect(header.getByText('new endpoint and UI')).toBeVisible();
    await expect(fact('Assignee')).toHaveText('bao');
    await expect(fact('Created by')).toHaveText('lead');
    await expect(fact('Created')).toHaveText('11 May, 16:00');
    await expect(fact('Updated')).toHaveText('11 May, 16:00');
    await expect(fact('Comments')).toHaveText('0');
    await expect(page.getByText('Owner', { exact: true })).toHaveCount(0);
    const colors = await page.evaluate(() => {
      const color = (label: string) => {
        const dt = [...document.querySelectorAll('dt')].find((el) => el.textContent === label) as HTMLElement;
        return [getComputedStyle(dt).color, getComputedStyle(dt.nextElementSibling as HTMLElement).color];
      };
      return color('Assignee');
    });
    expect(colors[0]).not.toBe(colors[1]);
  });
});
