# Milestone retro and close, and catching up with gin-workflow output

**Context**
gin-workflow 3.1.1 records a milestone's outcome as bead comments written by `/retro` and `/milestone-close`, and its `gin milestone show --json` gained `integration`, `deadline`, `away`, `remaining_days`, `assumed_days` and the warnings `spec_due`, `after_integration`, `open_bugs` (with `count`) and `oversized` (with `days`). An audit on 2026-11-15 (epic gin-console-workflow-catchup) compared `gin state`, `gin milestone list/show` and `bd` JSON with the console.

**Decision/Solution**
- The audit split the catch-up into three epics: milestones (this one, shipped), epic kind and capabilities (gin-console-it2), and the project card from `gin state` (gin-console-5ox).
- The Retro tab (`tab=retro`) reads the milestone bead's comments through the existing comments API; no backend endpoint. The parser (`frontend/src/features/milestones/retro.ts`) follows what the skills actually write, not only the documented contract:
  - the member is the rest of the first line (`[gin retro] <id> <member>`), an email in team mode or `git user.name` ("Ann Lee") otherwise;
  - `/milestone-close` writes one `Spillover:` line per moved epic and one `Action:` line per action, so repeated labels append;
  - the comments API can truncate a comment (`truncated`), shown as "Comment truncated";
  - the milestone id is matched exactly (`m1` is not `m10`).
- New milestone JSON fields are optional on both sides (null, or `{}` for `away`) so an older gin keeps working.

**Consequences**
- Changing the `[gin retro]` / `[gin close]` labels in gin-workflow needs a console change.
- Retro comments load once per page (shared by the tab label and the tab); a retro added while the page is open shows after Retry or a reload.
- `gin milestone update --away` refuses members outside `team.members`; test data sets `away` and `integration` with `bd update <ms> --set-metadata` instead.
- e2e specs ran green again only after `qa/e2e/evidence.ts` set `gin-console.email` (the login screen had blocked every spec); e2e is not in the verify checks, so breakage there is silent.

**References**
- `frontend/src/features/milestones/{retro.ts,RetroTab.tsx,useMilestoneComments.ts,gantt.ts,format.ts}`, `backend/src/gin_console/milestones/models.py`
- Change: `docs/changes/archive/2026-11-15-gin-console-workflow-catchup-milestone-catchup/`
- gin-workflow: `.planning/knowledge/milestone-retro-and-close.md`, `plugins/gin-workflow/src/skills/{retro,milestone-close}/SKILL.md`, `docs/reference/cli.md` (milestone)
- Beads: gin-console-workflow-catchup, gin-console-it2, gin-console-5ox, gin-console-uqn

**Scope**
The milestone page (Gantt, header, Retro tab), the milestones API models, and any later work that reads gin-workflow JSON or bead comments.
