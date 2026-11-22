// TC: TC-UI-274@ac5f3489
import { test, expect } from '../evidence';
import { entry, list, stubApi } from '../support/api';

test.use({ timezoneId: 'America/Los_Angeles' });

test('TC-UI-274: Calendar day across time zones', async ({ page, ev }) => {
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    projects: ['alpha'],
    milestones: () => list([entry('m1', { title: 'm1', status: 'active', start: '2026-11-02', end: '2026-12-01' })]),
  });

  await ev.step('1. Open `/milestones?project=alpha`', async () => {
    await page.goto('/milestones?project=alpha');
    const m1 = page.getByRole('list', { name: 'Milestones' }).getByRole('listitem').filter({ hasText: 'm1' });
    await expect(m1).toContainText('1 Dec');
    await expect(m1).not.toContainText('30 Nov');
  });
});
