// TC: TC-UI-420@abafdb91
import { test, expect } from '../evidence';
import { bead, beadDetail, stubApi, stubBeadDetails } from '../support/api';
import { PNG, type BeadImage } from '../support/images';

const A = 'a1'.repeat(32);
const description = `![Step 1](attachment:${A})\n  local: qa/evidence/r1/01.png`;
const base = { n: 1, path: 'qa/evidence/r1/01.png', sha256: A, caption: 'Step 1', available: true };

test('TC-UI-420: Attachment image inline (REQ-UI-028)', async ({ page, ev }) => {
  // Precondition: bug a-1 whose image 1 is served as an attachment; bug a-2 with the same text whose attachment is not fetched and whose file is available.
  const a1 = bead('a-1', { issue_type: 'bug', image_count: 1 });
  const a2 = bead('a-2', { issue_type: 'bug', image_count: 1 });
  const images: Record<string, BeadImage> = {
    'a-1': { ...base, served_as: 'attachment', reason: null },
    'a-2': { ...base, served_as: 'file', reason: null },
  };
  await stubApi(page, { projects: ['alpha'], beads: [a1, a2] });
  await stubBeadDetails(page, 'alpha', [a1, a2].map((b) => ({ ...beadDetail(b), description, images: [images[b.id]] }) as ReturnType<typeof beadDetail>));
  await page.route(/\/api\/beads\/alpha\/a-\d\/(images|attachments)\/.+$/, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  const inline = () => page.locator('.markdown').getByRole('img', { name: 'Step 1' });

  await ev.step('1. Open `/beads/alpha/a-1`', async () => {
    await page.goto('/beads/alpha/a-1');
    await expect(inline()).toHaveCount(1);
    await expect(inline()).toHaveAttribute('src', `/api/beads/alpha/a-1/attachments/${A}`);
    await expect(page.locator('.markdown')).toContainText('local: qa/evidence/r1/01.png');
  });

  await ev.step('2. Open `/beads/alpha/a-2`', async () => {
    await page.goto('/beads/alpha/a-2');
    await expect(inline()).toHaveCount(1);
    await expect(inline()).toHaveAttribute('src', '/api/beads/alpha/a-2/images/1');
    await expect(page.locator('.markdown')).toContainText('local: qa/evidence/r1/01.png');
  });
});
