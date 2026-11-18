// TC: TC-UI-116@5091db5b
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-116: Short id', async ({ page, ev }) => {
  await stubApi(page, { projects: ['alpha'], beads: [bead('ex-e4.1', { title: 'Short one' })] });

  await ev.step('1. Open /beads?project=alpha&milestone=all', async () => {
    await page.goto('/beads?project=alpha&milestone=all');
    await expect(page.getByText('ex-e4.1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('…')).toHaveCount(0);
  });
});
