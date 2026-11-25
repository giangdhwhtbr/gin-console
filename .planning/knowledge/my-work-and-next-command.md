# My work, next command, blockers and the jump palette

**Context**
Epic `gin-console-rm-my-work` (2026-11-25) turned My Tasks into My work (groups by what to do next), showed the command that continues a bead on its page, named blockers in headers and on cards, and added the jump palette (Ctrl+K or Cmd+K). It is frontend only, and the login email never leaves the browser.

**Decision/Solution**
- `gin state` reports one workflow (an epic): `stage`, `decision`, `gates`. `remedies` holds reasons for a hold, not commands, and no gin command answers the next step of a track. The console derives it in one pure function, `features/beads/nextCommand.ts` (REQ-BEADS-025): an epic takes `/gin:<stage>` from `stage`, a ready bead without an assignee or of mine takes `gin task update <id> --claim`, a bead of mine in progress takes `/gin:execute <id>`, everything else none.
- My work groups are one pure function, `features/my-tasks/groups.ts` (REQ-UI-150), over the beads of the current project; the state of a bead is the board-column state (`stateOf`), so an open bead that is neither ready nor blocked is Deferred and in no group. Epics, milestones and merge gates are left out, and prep beads only out of Unclaimed.
- Blockers are read in `features/beads/blockers.ts`: `blocked_by` of a bead summary holds every `blocks` dependency, closed ones included, so a blocker counts as closed only when a loaded bead says so; an unknown blocker counts as open and is named by its id; a merge gate is named like the Tracks table ("be #2, merge pending").
- The epic page loads the workflow once (`EpicPage`) and passes it to the header and the Workflow card; a details panel shows no epic command.
- The jump palette (`features/jump/`) is mounted in `App.tsx` with `key={epoch}`, so Refresh data drops its loaded beads; the first opening loads every configured project in parallel and a failing project is named.
- The jump palette (`JumpPalette`) sits inside the one `<Fragment key={epoch}>` in `App.tsx`: as a sibling with the same key it was never unmounted after Refresh data, and left its dialog, backdrop and keydown listener behind (8668d79, with a test). Siblings in Layout's children must not share a key.
- A parallel session can ship between the pre-checks and the merge of ship: compare origin/master with the base of the branch right before merging. gin-console-rm-overview shipped (8f6e3e7) while this epic was being checked; the branch then conflicted in `docs/specs/ui/spec.md`, frontend tests and 29 QA files, and TC-UI-381 to 385 had to become TC-UI-400 to 404.
- Review of a track is not readable from bead data while `project.review_ledger` is false: a track in review keeps status `in_progress`. The "In review" group was moved to gin-console-rm-review-audit, which was dropped on 2026-11-25, so no page shows it.

**Consequences**
- Claim commands are the solo form; a team-mode project is not told apart, and the stage of an epic with state Deferred gives no command.
- The epic page sends one workflow request on every tab (about one `gin state` call), also on Graph, Lanes and Discussion.
- Review findings left as follow-ups: the merge-gate label is still built by hand in `epicOverview.ts` (`blockerLabel` has the same wording), "held by a bead of mine" is written in `groups.ts` and `blockers.ts`, Ctrl+K while the palette is open clears the typed text.
- Two sessions shared the main checkout during this epic: one ran `git checkout`, so the spec and tracks of this epic lived in their own worktrees (`.planning/worktrees/gin-console-rm-my-work*`). gin-console-rm-overview edits REQ-UI-055, 057, 063, 072 and 099 too; the epic that ships second rewrites its MODIFIED blocks.

**References**
- `frontend/src/features/{my-tasks,beads,jump}/`, `frontend/src/app/App.tsx`
- Change: `docs/changes/archive/2026-11-25-gin-console-rm-my-work-my-work/`
- Beads: `gin-console-rm-my-work` (`.1` to `.5`); related [navigation-shell](navigation-shell.md), [one-set-of-definitions](one-set-of-definitions.md), [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md)

**Scope**
My work, bead headers and cards, the jump palette, and any rule that names a bead's next step or its blockers.
