// TC: TC-REQUIREMENTS-051@1aa074e2
import { test, expect } from '../evidence';
import { changeRow, signoff, stubRequirements } from '../support/requirements';

test('TC-REQUIREMENTS-051: Signed off (REQ-REQUIREMENTS-016)', async ({ page, ev }) => {
  // Precondition: an open change is signed off by ba; an archived change is not named by the trace.
  await stubRequirements(page, {
    projects: ['a'],
    changes: {
      changes: [
        changeRow('e1-login', { title: 'Login change', epic: 'e-1', added: 2, modified: 0, removed: 1,
          signoff: signoff({ state: 'current', actor: 'ba', at: '2026-11-20T10:00:00Z' }) }),
        changeRow('2026-10-01-old', { title: 'Old change', archived: '2026-10-01', signoff: null, added: null, modified: null, removed: null }),
      ],
      error: null, cause: null,
    },
  });

  await ev.step('1. Open `/requirements/changes?project=a`', async () => {
    await page.goto('/requirements/changes?project=a');
    const main = page.getByRole('main');
    const open = main.getByRole('listitem').filter({ hasText: 'Login change' });
    await expect(open).toContainText('Sign-off: ba, ');
    await expect(open).toContainText('2 added, 0 modified, 1 removed');
    await expect(open.getByRole('link', { name: 'e-1' })).toHaveAttribute('href', '/beads/a/e-1');
    await expect(open.getByRole('link', { name: 'Login change' })).toHaveAttribute('href', '/requirements/changes/e1-login?project=a');
    await expect(main.getByRole('listitem').filter({ hasText: 'Old change' })).toContainText('Sign-off: Unknown');
    const headings = await main.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings).toEqual(['Open', 'Archived']);
  });
});
