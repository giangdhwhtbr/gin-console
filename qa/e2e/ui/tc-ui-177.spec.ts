// TC: TC-UI-177@9dcae147
import { test, expect } from '../evidence';
import { E12, stubExample } from '../support/lanes';

test('TC-UI-177: Dependencies of a track show merge gates', async ({ page, ev }) => {
  // Precondition: track 4 is blocked by an open merge gate for track 2 of lane be and a closed merge gate for track 3 of lane fe.
  await stubExample(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await ev.step('1. Open the bead page of track 4', async () => {
    await page.goto(`/beads/example/${E12}.4`);
    const section = page.getByRole('heading', { name: 'Depends on' }).locator('..');
    await expect(section).toBeVisible();
    await expect(section.getByRole('listitem').filter({ hasText: 'Waits for be #2 · merge pending' })).toHaveCount(1);
    await expect(section.getByRole('listitem').filter({ hasText: 'Waits for fe #3 · merged' })).toHaveCount(1);
  });
});
