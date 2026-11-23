// TC: TC-UI-377@290e9761
import { test, expect } from '../evidence';
import { bead } from '../support/api';
import { E12, PROJECT, e12, plain } from '../support/lanes';
import { openEpicStubs } from '../support/epic';

test('TC-UI-377: No Show children on an epic page tab', async ({ page, ev }) => {
  // Precondition: the Graph tab of epic ex-e12 at 1440px wide; track ex-e12.3, which has a child, is selected.
  const beads = [...e12(), bead(`${E12}.3.1`, { title: 'Subtask', parent: `${E12}.3`, ready: true }), ...plain()];
  await openEpicStubs(page, beads);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/beads/${PROJECT}/${E12}?tab=graph&select=${E12}.3`);

  await ev.step('1. Read the panel', async () => {
    const panel = page.getByRole('complementary', { name: 'Bead details' });
    await expect(panel.getByRole('heading', { name: 'Track 3' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Open page' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Show children' })).toHaveCount(0);
  });
});
