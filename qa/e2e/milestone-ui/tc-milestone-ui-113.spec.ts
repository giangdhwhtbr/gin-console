// TC: TC-MILESTONE-UI-113@81f39d14
import { test, expect } from '../evidence';
import { detail, epicPlan, stubApi } from '../support/api';

// The warning builders of support/api.ts type only `days`; `open_bugs` also carries a `count`.
const warn = (code: string, extra: { days?: number; count?: number } = {}) => ({ code, days: extra.days ?? null, ...extra }) as { code: string; days: number | null };

test('TC-MILESTONE-UI-113: Several warnings give one verdict with a count', async ({ page, ev }) => {
  // Precondition: M1 has epic A with the warnings spec_due, open_bugs (count 2) and overflow (2 days).
  await page.addInitScript(() => window.localStorage.setItem('gin-console.email', 'qa@example.com'));
  await stubApi(page, {
    milestone: {
      M1: detail(
        [epicPlan('A', { title: 'Epic A', estimate_days: 5, planned_start: '2026-11-02', planned_end: '2026-11-06', warnings: [warn('spec_due'), warn('open_bugs', { count: 2 }), warn('overflow', { days: 2 })] })],
        { end: '2026-11-04', finish: '2026-11-06', overflow_days: 2 },
      ),
    },
  });
  const verdict = page.locator('[data-epic="A"] [data-verdict]');

  await ev.step('1. Set the window width to 1280 px', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await ev.step('2. Open /milestones/P/M1', async () => {
    await page.goto('/milestones/P/M1');
    await expect(verdict).toHaveCount(1);
    await expect(verdict).toHaveText('2 working days past the end+2');
    await expect(verdict.locator('svg[data-glyph="deferred"]')).toHaveCount(1);
    await expect(verdict).toHaveClass(/text-state-blocked/);
    await expect(verdict.getByText('+2', { exact: true })).toBeVisible();
  });

  await ev.step("3. Rest the pointer on A's verdict", async () => {
    await verdict.hover();
    const lines = ['2 working days past the end', '2 open bugs', 'Spec due before kick-off'];
    await expect(page.getByRole('tooltip')).toHaveText(lines.join('\n'), { useInnerText: true });
    const id = await verdict.getAttribute('aria-describedby');
    expect(id).not.toBeNull();
    await expect(page.locator(`[id="${id}"]`)).toHaveText(lines.join('\n'), { useInnerText: false });
  });
});
