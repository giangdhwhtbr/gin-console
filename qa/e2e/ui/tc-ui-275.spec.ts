// TC: TC-UI-275@043ac79d
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-275: Blocked count tooltip', async ({ page, ev }) => {
  // Precondition: project example has 4 blocked beads, so the Blocked column of its Board holds 4.
  const beads = [1, 2, 3, 4].map((n) => bead(`ex-${n}`, { title: `Blocked ${n}`, status: 'blocked', blocked: true, milestone: null }));
  await stubApi(page, { projects: ['example'], beads });

  await ev.step('1. Open `/beads?project=example&view=board`', async () => {
    await page.goto('/beads?project=example&milestone=all&view=board');
    await expect(page.getByRole('region', { name: 'Blocked' })).toBeVisible();
  });

  await ev.step('2. Rest the pointer on the count of the Blocked column', async () => {
    const count = page.getByRole('region', { name: 'Blocked' }).getByRole('heading').getByText('4', { exact: true });
    await expect(count).toBeVisible();
    await count.hover();
    await expect(page.getByRole('tooltip')).toHaveText(
      'Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart. Counted in this column.',
      { timeout: 500 },
    );
  });

  await ev.step('3. Press Escape', async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  });
});
