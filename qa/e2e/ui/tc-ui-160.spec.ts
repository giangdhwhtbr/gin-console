// TC: TC-UI-160@7100dc2a
import { test, expect } from '../evidence';
import { stubExample } from '../support/lanes';

test('TC-UI-160: Scope without lanes', async ({ page, ev }) => {
  // Precondition: epic ex-e3 of the example project has no child with a lane.
  await stubExample(page);

  await ev.step('1. Open /beads?project=example&view=lanes&scope=ex-e3', async () => {
    await page.goto('/beads?project=example&view=lanes&scope=ex-e3');
    await expect(page.getByText('Lanes show for an epic whose tracks have lanes')).toBeVisible();
    const link = page.getByRole('link', { name: 'Show the Graph view' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /view=graph/);
  });
});
