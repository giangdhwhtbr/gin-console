// TC: TC-UI-311@68bff344
import { test, expect } from '../evidence';
import { bead, detail, entry, epicPlan, list, stubApi } from '../support/api';
import { stubDetails } from '../support/lanes';
import { reportBody, teamBody } from '../support/reports';

test('TC-UI-311: No middle dots in page text', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const beads = [
    bead('P-e1', { title: 'Search relevance', issue_type: 'epic', status: 'in_progress', milestone: 'M1', assignee: 'qa@example.com', labels: ['area:backend', 'ui'], comment_count: 2, lane: 'be' }),
    bead('ex-t1', { title: 'Tune ranking weights', parent: 'P-e1', milestone: 'M1', assignee: 'qa@example.com', labels: ['ui'], comment_count: 3, priority: 1, ready: true }),
    bead('P-b1', { title: 'Totals differ by one cent', issue_type: 'bug', blocked: true, blocked_by: ['ex-t1'], dependency_count: 1, assignee: 'alice', labels: ['area:backend'], comment_count: 1, priority: 1 }),
  ];
  const stub = await stubApi(page, {
    beads,
    milestones: { ...list([entry('M1', { title: 'Beta readiness', status: 'active', epics: { total: 3, closed: 1 } })], { today: '2026-11-12' }), forecast: null, days_per_point: null } as never,
    milestone: { M1: detail([epicPlan('P-e1', { title: 'Search relevance', status: 'in_progress' })], { today: '2026-11-12' }) },
    milestoneOptions: { milestones: [{ id: 'M1', title: 'Beta readiness', status: 'active', start: '2026-11-02', end: '2026-11-27' }], current: 'M1' },
  });
  await stubDetails(page, beads, 'P');
  await page.route('**/api/reports/team**', (route) => route.fulfill({ json: teamBody('P') }));
  await page.route(/\/api\/reports\?/, (route) => route.fulfill({ json: reportBody('P', 30, { closed: 3 }) }));
  void stub;

  const pageText = () => page.evaluate(() => document.body.innerText);
  const noDots = async () => expect(await pageText()).not.toContain(' · ');

  await ev.step('1. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('link', { name: 'Search relevance' })).toBeVisible();
  });
  await ev.step('2. Read the text of the page and the document title', async () => {
    await noDots();
    await expect(page).toHaveTitle('Beads · P · gin-console');
  });

  await ev.step('3. Open `/beads/P/ex-t1`', async () => {
    await page.goto('/beads/P/ex-t1');
    await expect(page.getByRole('heading', { name: 'Tune ranking weights', level: 1 })).toBeVisible();
  });
  await ev.step('4. Read the text of the page', noDots);

  await ev.step('5. Open `/my-tasks?project=P`', async () => {
    await page.goto('/my-tasks?project=P');
    await expect(page.getByRole('heading', { name: 'My work', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tune ranking weights' })).toBeVisible();
  });
  await ev.step('6. Read the text of the page', noDots);

  await ev.step('7. Open `/milestones?project=P`', async () => {
    await page.goto('/milestones?project=P');
    await expect(page.getByRole('link', { name: /Beta readiness/ }).first()).toBeVisible();
  });
  await ev.step('8. Read the text of the page', noDots);

  await ev.step('9. Open `/milestones/P/M1`', async () => {
    await page.goto('/milestones/P/M1');
    await expect(page.getByRole('heading', { name: 'Beta readiness' }).first()).toBeVisible();
  });
  await ev.step('10. Read the text of the page', noDots);

  await ev.step('11. Open `/reports?project=P`', async () => {
    await page.goto('/reports?project=P');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  });
  await ev.step('12. Read the text of the page', noDots);
});
