// TC: TC-UI-202@292d92b7
import { test, expect } from '../evidence';
import { E12, PROJECT, factOf } from '../support/lanes';
import { entry } from '../support/api';
import { openEpicStubs } from '../support/epic';

test('TC-UI-202: Milestone forecast late (REQ-UI-120)', async ({ page, ev }) => {
  // Precondition: ex-m2 "Checkout v2" is active from 10 Nov to 1 Dec 2026 with a forecast finish of 16 Feb 2027; ex-e12 belongs to ex-m2; the date is 20 Nov 2026 (the milestones answer's `today`).
  await openEpicStubs(page, undefined, {
    today: '2026-11-20',
    milestones: [entry('ex-m2', { title: 'Checkout v2', status: 'active', start: '2026-11-10', end: '2026-12-01', finish: '2027-02-16' })],
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step(`1. Open /beads/${PROJECT}/${E12}`, async () => {
    await page.goto(`/beads/${PROJECT}/${E12}`);
    const card = page.getByRole('region', { name: 'Milestone' });
    const link = card.getByRole('link', { name: 'ex-m2 Checkout v2' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', `/milestones/${PROJECT}/ex-m2`);
    await expect(factOf(card, 'Window')).toHaveText('10 Nov – 1 Dec 2026');
    await expect(factOf(card, 'Ends in')).toHaveText('8 working days');
    const forecast = factOf(card, 'Forecast');
    await expect(forecast).toContainText('16 Feb 2027');
    await expect(forecast.locator('svg')).toHaveCount(1);
  });
});
