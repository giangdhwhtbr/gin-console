// TC: TC-UI-295@ac3cfcfc
import { test, expect } from '../evidence';
import { epicOf, nodeOf, stubProject, taskOf } from '../support/graph';

test('TC-UI-295: Same state, same mark in every view', async ({ page, ev }) => {
  // Precondition: P reports an in-progress task p-1 titled "Working" with a parent epic p-e1 (so the Tree and the Graph show it).
  // Light theme: lapis is #2557D6.
  await page.emulateMedia({ colorScheme: 'light' });
  await stubProject(page, 'P', [
    epicOf('p-e1', { title: 'The epic', status: 'in_progress' }),
    taskOf('p-1', 'p-e1', [], { title: 'Working', status: 'in_progress' }),
    // another epic waits on p-e1 so the project graph (only linked beads) draws it and its child
    epicOf('p-e2', { title: 'Later epic', blocked: true, blocked_by: ['p-e1'], dependency_count: 1 }),
  ]);
  const LAPIS = 'rgb(37, 87, 214)';

  const check = async (scope: ReturnType<typeof page.locator>) => {
    const mark = scope.locator('[data-state="in_progress"]');
    await expect(mark).toHaveText('In progress');
    const glyph = mark.locator('svg[data-glyph="in_progress"]');
    await expect(glyph).toBeVisible();
    // a ring plus a half-filled disc
    await expect(glyph.locator('circle')).toHaveCSS('stroke', LAPIS);
    await expect(glyph.locator('path')).toHaveCSS('fill', LAPIS);
    await expect(mark).toHaveCSS('color', LAPIS);
  };

  await ev.step('1. Open `/beads?project=P&view=board`', async () => {
    await page.goto('/beads?project=P&view=board');
    await expect(page.getByRole('link', { name: 'Working' })).toBeVisible();
  });

  await ev.step('2. Read the state mark on the card of `p-1`', async () => {
    await check(page.locator('[data-card][data-id="p-1"]'));
  });

  await ev.step('3. Open `/beads?project=P&view=list`', async () => {
    await page.goto('/beads?project=P&view=list');
    await expect(page.getByRole('treeitem').first()).toBeVisible();
    // the list is the tree of beads: the epic starts collapsed
    await page.getByRole('button', { name: 'Expand all' }).click();
  });

  await ev.step('4. Read the state mark on the row of `p-1`', async () => {
    const row = page.locator('[role="treeitem"][data-id="p-1"]');
    await expect(row).toBeVisible();
    await check(row);
  });

  await ev.step('5. Open `/beads?project=P&view=tree`', async () => {
    await page.goto('/beads?project=P&view=tree');
    // this console has no `view=tree` (VIEWS: list, board, focus, graph, lanes): the URL falls back to the list, which is the tree
    await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Expand all' }).click();
    await expect(page.locator('[role="treeitem"][data-id="p-1"]')).toBeVisible();
  });

  await ev.step('6. Read the state mark on the row of `p-1`', async () => {
    await check(page.locator('[role="treeitem"][data-id="p-1"]'));
  });

  await ev.step('7. Open `/beads?project=P&view=graph`', async () => {
    await page.goto('/beads?project=P&view=graph&scope=p-e1&milestone=all'); // the project graph draws epics; the tasks of p-e1 show with it as the container
    await expect(nodeOf(page, 'p-1')).toBeVisible();
  });

  await ev.step('8. Read the state mark on the node of `p-1`', async () => {
    await check(nodeOf(page, 'p-1'));
  });
});
