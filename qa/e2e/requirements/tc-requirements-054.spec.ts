// TC: TC-REQUIREMENTS-054@71efced5
import { test, expect } from '../evidence';
import { changeContent, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-054: Script in Markdown (REQ-REQUIREMENTS-017)', async ({ page, ev }) => {
  // Precondition: a proposal holds `<script>alert(1)</script>`.
  await stubRequirements(page, {
    projects: ['a'],
    change: { 'e1-login': changeContent('e1-login', { proposal: '# Proposal text\n\n<script>window.__ran = true; alert(1)</script>\n' }) },
  });
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });

  await ev.step('1. Open `/requirements/changes/e1-login?project=a`', async () => {
    await page.goto('/requirements/changes/e1-login?project=a');
    await expect(page.getByRole('heading', { name: 'Proposal text' })).toBeVisible();
    expect(dialogs).toEqual([]);
    expect(await page.evaluate(() => 'ran' in window || '__ran' in window)).toBe(false);
    await expect(page.locator('main script')).toHaveCount(0);
  });
});
