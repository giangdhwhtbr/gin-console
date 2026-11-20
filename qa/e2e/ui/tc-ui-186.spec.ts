// TC: TC-UI-186@8fb1dea8
import { test, expect } from '../evidence';
import { e12Open, openGraph, stubExample } from '../support/lanes';

test('TC-UI-186: Lane colours follow the lane name', async ({ page, ev }) => {
  // Precondition: lanes be, fe, infra and qa (all tracks open here, so every box is drawn without "Show closed"); bao is the assignee of the tracks of lane fe only.
  await stubExample(page, e12Open());
  await page.setViewportSize({ width: 1440, height: 900 });
  const colour = (lane: string) => page.locator(`section[data-lane="${lane}"]`).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--box'));

  await ev.step('1. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12', async () => {
    await openGraph(page);
    await expect(page.locator('section[data-lane]')).toHaveCount(5);
  });

  await ev.step('2. Note the colours of the fe, be, infra and qa boxes', async () => {
    expect([await colour('be'), await colour('fe'), await colour('infra'), await colour('qa')]).toEqual([
      'var(--lane-1)', 'var(--lane-2)', 'var(--lane-3)', 'var(--lane-4)',
    ]);
  });

  await ev.step('3. Open /beads?project=example&milestone=all&view=graph&scope=ex-e12&assignee=bao', async () => {
    await openGraph(page, '&assignee=bao');
    await expect(page.locator('section[data-lane]')).toHaveCount(1);
    await expect(page.locator('section[data-lane="fe"]')).toBeVisible();
    expect(await colour('fe')).toBe('var(--lane-2)');
  });
});
