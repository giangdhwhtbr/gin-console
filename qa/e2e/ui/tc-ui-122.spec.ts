// TC: TC-UI-122@1fca1978
import { test, expect } from '../evidence';
import { bead, stubApi } from '../support/api';

const TITLE = 'Move every checkout payment flow onto the new provider and retire the legacy gateway fully'.slice(0, 80);

test('TC-UI-122: Long state line (REQ-UI-049)', async ({ page, ev }) => {
  // Precondition: alpha has the in-progress epic e-1 (no parent, 80-character title) with 2 of its 5 tracks done.
  expect(TITLE).toHaveLength(80);
  await stubApi(page, {
    projects: ['alpha'],
    beads: [
      bead('e-1', { title: TITLE, issue_type: 'epic', status: 'in_progress', dependent_count: 1 }),
      bead('e-1.1', { parent: 'e-1', status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
      bead('e-1.2', { parent: 'e-1', status: 'closed', closed_at: '2026-10-09T00:00:00Z' }),
      bead('e-1.3', { parent: 'e-1', ready: true }),
      bead('e-1.4', { parent: 'e-1', ready: true }),
      bead('e-1.5', { parent: 'e-1', ready: true }),
      // The project graph shows only linked beads by default: another epic waits on e-1, so e-1 has a link.
      bead('e-2', { issue_type: 'epic', blocked: true, blocked_by: ['e-1'], dependency_count: 1 }),
    ],
  });

  await ev.step('1. Open /beads?project=alpha&milestone=all&view=graph', async () => {
    // `closed=1` is setup the case does not state: without it the page loads no closed bead and the node reads "0 of 3 done".
    await page.goto('/beads?project=alpha&milestone=all&view=graph&closed=1');
    const node = page.locator('[data-node="e-1"]');
    await expect(node).toBeVisible();
    const n = (await node.boundingBox())!;
    // The id, the title and the state each take one line inside the node.
    const lines = node.locator('> span');
    await expect(lines).toHaveCount(3);
    const idLine = (await lines.nth(0).boundingBox())!;
    const titleLine = lines.nth(1);
    await expect(titleLine).toHaveText(TITLE);
    const stateLine = (await lines.nth(2).boundingBox())!;
    const lh = await titleLine.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    expect((await titleLine.boundingBox())!.height).toBeLessThanOrEqual(lh + 1);
    expect(idLine.height).toBeLessThan(lh);
    expect(stateLine.height).toBeLessThanOrEqual(lh + 1);
    for (const b of [idLine, (await titleLine.boundingBox())!, stateLine]) {
      expect(b.x).toBeGreaterThanOrEqual(n.x - 0.5);
      expect(b.x + b.width).toBeLessThanOrEqual(n.x + n.width + 0.5);
      expect(b.y).toBeGreaterThanOrEqual(n.y - 0.5);
      expect(b.y + b.height).toBeLessThanOrEqual(n.y + n.height + 0.5);
    }
    // "2 of 5 done" is shown in full.
    const done = node.getByText('2 of 5 done');
    await expect(done).toBeVisible();
    const d = (await done.boundingBox())!;
    expect(d.x + d.width).toBeLessThanOrEqual(n.x + n.width + 0.5);
    const clip = await done.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const probe = document.createRange();
      probe.selectNodeContents(el);
      return probe.getBoundingClientRect().right <= r.right + 0.5;
    });
    expect(clip).toBe(true);
  });
});
