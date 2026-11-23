// TC: TC-UI-146@bcb922a5
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

test('TC-UI-146: Priority as bold text (REQ-UI-110)', async ({ page, ev }) => {
  // Precondition: project alpha has beads at P0, P1 and P2.
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubApi(page, {
    projects: ['alpha'],
    beads: [bead('a-0', { priority: 0 }), bead('a-1', { priority: 1 }), bead('a-2', { priority: 2 })],
  });

  await ev.step('1. Open `/beads?project=alpha&view=list`', async () => {
    await page.goto('/beads?project=alpha&view=list');
    await expect(page.getByRole('link', { name: /Title a-2/ })).toBeVisible();
    const { muted, text } = await page.evaluate(() => {
      const paint = (cls: string) => {
        const el = document.createElement('span');
        el.className = cls;
        document.body.append(el);
        const color = getComputedStyle(el).color;
        el.remove();
        return color;
      };
      return { muted: paint('text-muted-foreground'), text: paint('text-foreground') };
    });
    expect(muted).not.toBe(text);
    const styleOf = (label: string) =>
      page.getByText(label, { exact: true }).first().evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          color: s.color, weight: Number(s.fontWeight), background: s.backgroundColor,
          border: parseFloat(s.borderTopWidth) + parseFloat(s.borderLeftWidth), radius: parseFloat(s.borderTopLeftRadius),
        };
      });
    for (const label of ['P0', 'P1', 'P2']) {
      const s = await styleOf(label);
      expect(s.background, `${label} has no fill`).toBe('rgba(0, 0, 0, 0)');
      expect(s.border, `${label} has no border`).toBe(0);
      expect(s.radius, `${label} is not rounded like a pill`).toBe(0);
      if (label === 'P2') expect(s.color, 'P2 colour').toBe(muted);
      else {
        expect(s.color, `${label} colour`).toBe(text);
        expect(s.weight, `${label} is bold`).toBeGreaterThanOrEqual(600);
      }
    }
  });
});
