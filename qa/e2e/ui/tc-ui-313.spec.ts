// TC: TC-UI-313@fdb32505
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-313: Link in a sentence is underlined in the identity colour', async ({ page, ev }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  const b = bead('p-1', { title: 'Read the docs', issue_type: 'task' });
  await stubApi(page, { beads: [b] });
  await page.route('**/api/beads/P/p-1', (route) =>
    route.fulfill({
      json: {
        ...b, description: 'See [docs](https://example.com)', design: null, notes: null, acceptance_criteria: null,
        close_reason: null, dependencies: [], dependents: [], children: [], bugs: [],
      },
    }),
  );
  await page.route('**/api/beads/P/p-1/comments', (route) => route.fulfill({ json: [] }));

  await ev.step('1. Open `/beads/P/p-1`', async () => {
    await page.goto('/beads/P/p-1');
    await expect(page.getByRole('heading', { name: 'Read the docs', level: 1 })).toBeVisible();
  });

  await ev.step('2. Find the link "docs" in the description', async () => {
    await expect(page.getByRole('link', { name: 'docs', exact: true })).toBeVisible();
  });

  await ev.step('3. Read its computed `text-decoration-line`, `text-decoration-thickness` and `text-decoration-color`', async () => {
    const link = page.getByRole('link', { name: 'docs', exact: true });
    await expect(link).toHaveCSS('text-decoration-line', /underline/);
    await expect(link).toHaveCSS('text-decoration-thickness', '1px');
    // amethyst (#6A3DB8) at half strength
    await expect(link).toHaveCSS('text-decoration-color', /^rgba\(106, 61, 184, 0\.5\)$|^color\(srgb 0\.415\d* 0\.239\d* 0\.72\d* \/ 0\.5\)$/);
  });
});
