// TC: TC-UI-338@00a51d1f
import { test, expect } from '../evidence';
import { bead, milestoneOption, stubApi } from '../support/api';

const options = {
  milestones: [milestoneOption('ex-m2', { title: 'Checkout v2', status: 'active' })],
  current: 'ex-m2',
};

import { readabilityFindings, show } from '../support/readability';

const LONG = 'nguyen.thi.thanh.huong.payments-team@example-company.com.vn';

test('TC-UI-338: Filter bar on one line at 1024px (REQ-UI-142)', async ({ page, ev }) => {
  // Precondition: project example, current milestone ex-m2 "Checkout v2"; window 1024px.
  await page.setViewportSize({ width: 1024, height: 768 });
  await stubApi(page, {
    projects: ['example'],
    milestoneOptions: options,
    beads: [
      bead('ex-1', { title: 'Pay invoice', priority: 1, status: 'in_progress', assignee: LONG, milestone: 'ex-m2' }),
      bead('ex-2', { title: 'Ship cart', priority: 1, status: 'open', assignee: 'bob', milestone: 'ex-m2' }),
    ],
  });

  await ev.step('1. Open the page', async () => {
    await page.goto(`/beads?project=example&status=open,in_progress,blocked,deferred&assignee=${LONG}&priority=1`);
    await expect(page.getByRole('link', { name: 'Pay invoice' })).toBeVisible();
    const search = page.getByRole('searchbox', { name: 'Search' });
    const chips = [
      page.getByRole('button', { name: /^Milestone Checkout v2/ }),
      page.getByRole('button', { name: /^Status /, }),
      page.getByRole('button', { name: /^Assignee /, }),
    ];
    const more = page.getByRole('button', { name: /^More filters/ });
    const clear = page.getByRole('button', { name: 'Clear filters' });
    const count = page.getByText(/^\d+ of \d+$/);
    const closed = page.getByRole('switch', { name: 'Show closed' });
    for (const l of [search, ...chips, more, clear, count, closed]) await expect(l).toBeVisible();

    // the first line: search, chips and More filters share one top (within the control heights)
    const line = [];
    for (const l of [search, ...chips, more]) line.push((await l.boundingBox())!);
    const centre = (b: { y: number; height: number }) => b.y + b.height / 2;
    for (const b of line) expect(Math.abs(centre(b) - centre(line[0]))).toBeLessThan(8);
    expect(line[0].width).toBeGreaterThanOrEqual(128);
    for (let i = 1; i < line.length; i++) expect(line[i].x).toBeGreaterThanOrEqual(line[i - 1].x + line[i - 1].width - 1);
    const bottom = Math.max(...line.map((b) => b.y + b.height));
    // Clear filters, the count and Show closed: on the line below
    for (const l of [clear, count, closed]) expect((await l.boundingBox())!.y).toBeGreaterThanOrEqual(bottom - 1);

    // a chip keeps its name and the x whole; its full text is the title; a clipped value ends with an ellipsis
    for (const chip of chips) {
      const name = (await chip.getAttribute('aria-label'))!;
      await expect(chip).toHaveAttribute('title', name);
      const label = name.split(' ')[0];
      const spans = chip.locator('span');
      const labelBox = (await spans.first().boundingBox())!;
      const chipBox = (await chip.boundingBox())!;
      expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(chipBox.x + chipBox.width + 1);
      expect(await spans.first().evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(page.getByRole('button', { name: `Remove ${label} filter` })).toBeVisible();
      const value = spans.nth(1);
      if (name.startsWith('Assignee')) {
        // the long assignee does not fit: ellipsis, scrollWidth beyond clientWidth, full text in the title
        expect(await value.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
        expect(await value.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
        expect(name).toContain('nguyen.thi.thanh.huong.payments-team');
      }
    }
    const findings = await readabilityFindings(page);
    expect(findings, show(findings)).toEqual([]);
  });
});
