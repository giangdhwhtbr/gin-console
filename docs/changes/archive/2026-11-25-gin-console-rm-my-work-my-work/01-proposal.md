# My work

Epic: gin-console-rm-my-work
Kind: capability
Points: 5 (5 stories, 6 new REQs and 8 modified, frontend only: grouped My work page, next-command rule, blocker in header and cards, jump palette, phone cards; same size as gin-console-rm-wbs-export = 5)
Date: 2026-11-25

## Why

A developer opens My Tasks and sees a flat list of beads assigned to them. The list does not tell them what to do next, what is ready for anyone to take, whom they are holding up, or which command continues a bead, so they go back to the terminal and re-derive it. On a phone the list is a table whose columns squeeze the task text. My Tasks becomes My work: the page says what to do next, each bead page shows the one command that continues it, and any bead can be opened in a few keys.

Comments on the epic before this discuss:
- Navigation shell shipped (merge `2ca8410`, 2026-11-21): the sidebar, the current project in the URL, the remembered place and the breadcrumb are in place. My work keeps their rules, and the label "My Tasks" becomes "My work" in the navigation, the page title and the breadcrumb.
- One set of definitions shipped (its comment on gin-console-rm-overview): ready, blocked, assignee and "Unassigned" have one meaning; My work reuses them.

Comments considered: 1, latest 2026-11-21T16:00:30Z

Facts found while exploring the code:
- `gin state` reports a stage, a decision and gates of one workflow (an epic); `remedies` holds reasons for a hold, not commands, and there is no per-bead next step. The console names the next command itself (REQ-BEADS-025).
- Nothing in the console records which beads are in review: `project.review_ledger` is off for gin-console and a track in review keeps status `in_progress`.
- The console has no areas: no label or configuration names one, and gin-console does not run in team mode.

User decisions 2026-11-25:
- **In review:** out of this epic; gin-console-rm-review-audit reads the local review ledgers.
- **Unclaimed:** Next up has two groups, Assigned to me and Unclaimed (every ready bead without an assignee of the current project); areas are not used.
- **Next command source:** the console derives it from the bead's state and assignee, and from the workflow stage for an epic.
- **Jump palette scope:** all configured projects.
- **Architecture:** frontend only. The groups, the next command and the blocker titles are pure functions over data the API already serves; the email stays in the browser (REQ-UI-097).
- **Groups:** a Blocked group holds the beads assigned to me that are blocked, so that none of them is lost.

Assumptions (defaults taken without a question):
- The claim command is the solo form `gin task update <id> --claim`; a project in team mode, which uses `gin team claim <id>`, is not told apart.
- Slash commands are written `/gin:<stage>`, the prefix of the gin plugin in Claude Code.
- The address `/my-tasks` stays, so bookmarks and the remembered place keep working.
- The jump palette covers closed beads, after open ones.

Risk: gin-console-rm-overview, discussed in another session on the same day, modifies the same navigation requirements (REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-099) to add an Overview link. The epic that ships second rewrites its MODIFIED blocks on the new text (`gin specs lint` names the stale ones).

## What Changes

- **My work page** (`/my-tasks`, named "My work"): groups Next up (Assigned to me, Unclaimed), In progress, Blocked, Waiting on me and, with "Show closed", Closed; blocker names on the Blocked and Waiting on me rows; cards under 768px.
- **Bead header** (bead page, epic page and details panel): the next command with Copy above "View in graph", and "Blocked by" with each open blocker as a link.
- **Bead cards** (Board and Focus): "Blocked by <title>".
- **Jump palette**: Ctrl+K or Cmd+K finds a bead of any project by id or title.
- **No backend change.**

## User Stories

### US-1: See what to do next
As a developer, I want my beads grouped by what I can do with them, so that I start the next one without working out its state.
REQ: REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-150

Acceptance criteria:
- My work shows the groups Next up (Assigned to me, Unclaimed), In progress, Blocked and Waiting on me, each with its count.
- A ready bead assigned to another person, an epic, a milestone and a merge gate are in no group.
- A blocked bead of mine names its first open blocker, and a bead that waits on one of mine names that bead.
- The navigation link, the page title and the breadcrumb read "My work", and the address stays `/my-tasks`.

### US-2: Copy the command that continues a bead
As a developer, I want the next command on the bead page with a Copy button, so that I start or continue the bead without looking up the command.
REQ: REQ-BEADS-025, REQ-UI-151

Acceptance criteria:
- A ready bead that is unassigned or mine shows `gin task update <id> --claim`; a bead I have in progress shows `/gin:execute <id>`; an epic shows the command of its workflow stage.
- A closed, blocked or deferred bead, or a bead another person has in progress, shows no command.
- Copy writes the exact command and reads "Copied" for 2 seconds.

### US-3: See what blocks a bead
As a developer, I want the blockers named in the bead header and on cards, so that I know which bead to unblock or ask about.
REQ: REQ-UI-152, REQ-UI-065

Acceptance criteria:
- The header of a blocked bead reads "Blocked by" with each open blocker's title as a link.
- A Board or Focus card of a blocked bead reads "Blocked by <title>", and "+<n>" when there are more blockers.

### US-4: Jump to a bead
As a developer, I want to open any bead from the keyboard, so that I reach it without paging through lists.
REQ: REQ-UI-154

Acceptance criteria:
- Ctrl+K or Cmd+K opens a dialog that finds a bead of any configured project by id or title and opens its page.
- A project whose beads cannot be loaded is named, and the other projects stay searchable.

### US-5: Use My work on a phone
As a developer, I want cards instead of a table on a narrow screen, so that I can read my tasks on a phone.
REQ: REQ-UI-153

Acceptance criteria:
- Under 768px the groups show cards with the id, the priority, the title, the state and the blocker text, without horizontal scroll.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `ui` | `REQ-UI-150`, `REQ-UI-151`, `REQ-UI-152`, `REQ-UI-153`, `REQ-UI-154`; modified `REQ-UI-055`, `REQ-UI-057`, `REQ-UI-063`, `REQ-UI-065`, `REQ-UI-072`, `REQ-UI-099`, `REQ-UI-100`, `REQ-UI-101` | `docs/specs/ui/diagrams/my-tasks-activity.md`, `docs/specs/ui/diagrams/jump-palette-activity.md`, `docs/specs/ui/use-cases/pick-next-work.md`, `docs/specs/ui/use-cases/jump-to-a-bead.md` |
| `beads` | `REQ-BEADS-025` | `docs/specs/beads/diagrams/next-command-activity.md` |

## Non-goals

- Running any command from the console; it only shows and copies commands.
- An "In review" group or any review status (gin-console-rm-review-audit).
- Areas of a team, and team-mode claim commands.
- Changes to the backend or to the Beads views other than the card blocker line.

## Success Criteria

- On a project with beads of every state, My work shows each group with the beads the rules of REQ-UI-150 name, and none of the others.
- The bead page of a ready, an in-progress and a closed bead shows the command of REQ-BEADS-025, or none, and Copy puts it in the clipboard.
- Ctrl+K opens a bead of another project by a word of its title.
- My work has no horizontal scroll at 390px.
- `pytest`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test, and `gin-qa cases check --change gin-console-rm-my-work` prints `ok`.
