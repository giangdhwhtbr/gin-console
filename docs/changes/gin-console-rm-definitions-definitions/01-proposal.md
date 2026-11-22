# One set of definitions

Epic: gin-console-rm-definitions
Kind: capability
Date: 2026-11-22

## Why

The UX review of 2026-11-21 found that the console's numbers mean different things on different pages:
- One scope showed 19, 17 and 0 blocked beads. Each page counts blocked its own way:
  - The Projects page uses the dependency rule and ignores status `blocked`.
  - The Beads API adds status `blocked`.
  - The Board puts a blocked bead that is in progress under In Progress.
  - The Reports Team tab counts status `blocked` only.
  - The Gantt looks at the epic's status only.
- Epic progress changes with "Show closed", because three frontend counters count only the loaded beads.
- The Assignee column, the Board card and the Assignee filter show the owner when a bead has no assignee.
- One person appears twice, as a handle (`giangdhwhtbr`) and as an email (`giangdhwhtbr@gmail.com`).
- A milestone bead shows its bead status ("Open") while its milestone page says "Active". "Late" is computed three ways.
- Dates are written in at least five formats.
- Size, points, prep, lanes and link counts carry no explanation beyond a `title` that repeats the text.
- PM views use gin-workflow jargon (Say/do, d/pt, Unestimated).

User decisions 2026-11-21 and 2026-11-22:
- **Scope:** AI usage coverage leaves this epic. gin-workflow-wkwb removed `gin usage`, and gin-console-5c4 removes Data coverage from Reports. The epic's description was copied from gin-console-rm-strung and has been rewritten from the roadmap.
- **Blocked:** a bead that is not closed and has status `blocked`, or an open blocker of its own or of an ancestor, as `bd blocked` works it out (REQ-BEADS-007).
  - It counts whatever the status. A blocked in-progress bead is counted as blocked, not in progress.
  - Prep tasks are counted apart. Merge gates and milestones are left out.
- **Identity:** an email and a handle are one person when the handle equals the part of the email before `@`. The person is named by the handle. There is no alias configuration.
- **Milestone:** wherever a milestone bead appears, it shows its milestone status. Late has one rule:
  - an open milestone whose forecast finish, or today, is after its end;
  - a closed milestone that closed after its end.
  - "Behind pace" stays, as a pace word only.
- **Dates:** "21 Nov" in the current year and "21 Nov 2025" otherwise, with times as "21 Nov, 14:05".
- **Approach:** the backend owns the rules in one module, `beads/definitions.py`. The API carries `blocked` and the new `child_counts`, and the frontend renders them.

## What Changes

- **One blocked rule** for the Projects counts, the Board and Focus columns, the Team figures and the Gantt rows.
  - In-progress counts leave blocked beads out.
  - Board and Focus put a blocked bead in Blocked first.
  - Column counts show prep tasks apart, as "2 + 1 prep".
- **Child counts in the API:** each bead gets `child_counts: {total, closed, prep_total, prep_closed}`, counted over the whole export. Every progress display reads them, so "Show closed" no longer changes them.
- **Real assignee:** the console shows the assignee, or "Unassigned", and never the owner. The bead page shows the creator once instead of both "Owner" and "Created by".
- **One person per handle and email** in the Assignee filter, Group by assignee, My Tasks and the Team members.
- **Me filter:** "Me" is the first option of the Assignee filter, kept as `assignee=me`.
- **Milestone status and late:**
  - One status mark for the milestone list, the milestone page, the bead page header, the Graph node, the bead's milestone card and the Team tab.
  - One late rule for the Milestones list, the milestone cards, the Team chip and the Team headline.
- **One date format** from one helper.
- **Tooltips** on hover and focus for state marks, size, points, prep, lanes, link counts and the blocked, done and progress numbers, each with its rule and scope.
- **Legend:** a "Legend" panel on the Beads, milestone and Reports pages.
- **Plain labels** in PM views:
  - Commitment met; Parallel lanes; Not estimated; days per point.
  - "n of m done"; "Prep n of m done".
  - "Spec approved" and "Spec not approved yet"; "unassigned"; "late".

## User Stories

### US-1: One blocked number
As a team lead, I want the blocked count to follow one rule on Projects, Beads and Reports, so that I can trust the number I report.
REQ: REQ-BEADS-021, REQ-SERVER-006, REQ-UI-031, REQ-UI-033, REQ-REPORTS-009, REQ-REPORTS-010

Acceptance criteria:
- In the `example` project, the Projects card, the Board's Blocked column and the Focus view's Blocked column show the same blocked number.
- A bead with status `blocked` and no blocker counts as blocked on every page.
- An in-progress bead with an open blocker sits in the Blocked column of the Board and of the Focus view, and is counted as blocked, not as in progress.
- The Team figures count blocked beads by the same rule over the milestone's scope, and their tooltip names that scope.

### US-2: Progress that stays put
As a PM, I want an epic's progress to read the same whatever filters I use, so that "3 of 5 done" always means three of its five tracks are closed.
REQ: REQ-BEADS-022, REQ-UI-130, REQ-UI-028, REQ-UI-044, REQ-UI-120

Acceptance criteria:
- With "Show closed" off, an epic with 3 of 5 tracks closed still reads "3/5 closed" in the List and "3 of 5 done" in the Graph.
- The epic Overview, the bead page and the Gantt row show the same numbers.

### US-3: Who really holds the work
As a team lead, I want to see each bead's real assignee, and one entry per person, so that I know who has the work and who has nothing assigned.
REQ: REQ-UI-135, REQ-BEADS-023, REQ-UI-034, REQ-UI-065, REQ-UI-121, REQ-UI-082, REQ-UI-100

Acceptance criteria:
- A bead with an owner and no assignee reads "Unassigned" in the List, on its card, on its page and in the Tracks table.
- Beads assigned to `giangdhwhtbr` and to `giangdhwhtbr@gmail.com` appear under one person in the Assignee filter, in Group by assignee and in the Team members.
- "Unassigned" in the filter matches beads without an assignee, whatever their owner.

### US-4: My beads in one click
As a developer, I want a "Me" option in the Assignee filter, so that I see my beads without looking for my name.
REQ: REQ-BEADS-024

Acceptance criteria:
- With the login email `giangdhwhtbr@gmail.com`, "Me" shows the beads assigned to `giangdhwhtbr` or to that email, and the URL holds `assignee=me`.
- A shared link with `assignee=me` shows each viewer their own beads.

### US-5: One milestone status, one meaning of late
As a PM, I want a milestone to show the same status and the same late mark on every page, so that I never explain two answers for one milestone.
REQ: REQ-MILESTONE-UI-022, REQ-MILESTONE-UI-023, REQ-REPORTS-012, REQ-UI-095, REQ-MILESTONE-UI-001

Acceptance criteria:
- The bead page and the Graph node of an active milestone read "Active", as its milestone page does.
- A milestone whose forecast finish is after its end is marked late on the Milestones list, on the milestone card of its epics and on the Team tab.
- The Team headline says "behind pace" only for pace, and "late" only by the late rule.

### US-6: Dates read one way
As a team member, I want every date written the same way, so that I can compare dates across pages at a glance.
REQ: REQ-UI-131

Acceptance criteria:
- On 21 Nov 2026, the date 5 Nov 2026 reads "5 Nov", the date 1 Dec 2025 reads "1 Dec 2025", and a bead created on 11 May 2026 at 16:00 reads "11 May, 16:00".
- A milestone ending on 1 Dec reads "1 Dec" in every time zone.

### US-7: Understand a number without asking
As a newcomer, I want each mark and count to explain itself, so that I can read the console without being taught its terms.
REQ: REQ-UI-132, REQ-UI-133, REQ-REPORTS-013

Acceptance criteria:
- Hovering over, or focusing, the blocked count of a Projects card shows its rule and scope.
- "Legend" on the Beads page lists the five state marks and the meaning of blocked, done and progress, and it fits a 390px window.

### US-8: Words a PM uses
As a PM, I want the Milestones and Reports pages to use plain words, so that I can read them out in a status meeting.
REQ: REQ-UI-134, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021, REQ-REPORTS-018

Acceptance criteria:
- The Milestones list reads "Commitment met 62%" under "Commitment met", and lanes under "Parallel lanes".
- The forecast card reads "Not estimated".
- The Velocity tab reads "1.4 days per point".
- A Gantt row reads "5 of 11 done", "Prep 1 of 3 done" and "Spec approved".

## Capabilities Affected

- `beads`:
  - ADDED: REQ-BEADS-021, REQ-BEADS-022, REQ-BEADS-023, REQ-BEADS-024.
  - Diagrams: `docs/specs/beads/diagrams/bead-counts-activity.md`, `docs/specs/beads/diagrams/bead-state.md`, `docs/specs/beads/diagrams/me-filter-activity.md`.
  - Use cases: `docs/specs/beads/use-cases/filter-my-beads.md`.
- `server`:
  - MODIFIED: REQ-SERVER-006.
- `ui`:
  - ADDED: REQ-UI-130, REQ-UI-131, REQ-UI-132, REQ-UI-133, REQ-UI-134, REQ-UI-135.
  - MODIFIED: REQ-UI-028, REQ-UI-031, REQ-UI-033, REQ-UI-034, REQ-UI-044, REQ-UI-065, REQ-UI-082, REQ-UI-095, REQ-UI-100, REQ-UI-120, REQ-UI-121.
  - Diagrams: `docs/specs/ui/diagrams/legend-tooltip-activity.md`.
  - Use cases: `docs/specs/ui/use-cases/read-a-definition.md`.
- `reports`:
  - MODIFIED: REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-018.
- `milestone-ui`:
  - ADDED: REQ-MILESTONE-UI-022, REQ-MILESTONE-UI-023.
  - MODIFIED: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-021.
  - Diagrams: `docs/specs/milestone-ui/diagrams/milestone-state.md`, `docs/specs/milestone-ui/diagrams/milestone-status-activity.md`.
- Assets: none. The UX review of 2026-11-21 is not a confirmed asset and stays outside the repository.

## Assumptions

- **Prep in the Beads views:** prep task cards stay in the Board and Focus columns, and the column header counts them apart ("2 + 1 prep"), as the Projects page does.
- **Deferred and blocked:** a deferred bead with an open blocker shows as Blocked, so that the Board matches the blocked count of the Projects page.
- **Projects `open` count:** it keeps its meaning (status `open`). Only `blocked` and `in_progress` change.
- **Team buckets:** a blocked in-progress bead falls in the `open` bucket, so `scope = closed + in_progress + open` still holds, and `blocked` stays a part of `open`.
- **Creator fact:** the bead page shows "Created by" as the person of `created_by`, falling back to `owner`. "Owner" is no longer a separate fact.
- **Lane holder:** "Held by … Unclaimed" in the Lanes view stays. It describes lane claims, not assignees.
- **Plain labels:** they apply to the Milestones list, the milestone page and Reports. The Beads views keep "x/y closed" and "Prep x/y" until gin-console-rm-strung replaces them with the strand.
- **Milestones list on Reports:** the Reports page requests the Milestones list once per project and refresh, for the Team late mark and the Velocity tab. Without it, the Team tab applies the late rule without the forecast.
- **Tooltip reach:** marks that do not take keyboard focus (inside List rows and cards) are explained in the Legend for keyboard and touch users. No new tab stops are added to rows.

## Non-goals

- AI usage, Data coverage and the `gin usage` hints (epic gin-console-5c4).
- Palette, type scale, state mark shapes, the progress strand, middle dots, all-caps labels and chip counts (epic gin-console-rm-strung).
- The one-line filter bar and the click rule (epic gin-console-rm-beads-views).
- A people alias list in the config, and any change to gin-workflow's JSON.

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- `gin specs lint --change gin-console-rm-definitions --against master` prints `ok`, and `gin specs trace` lists no missing REQ.
- TC-1 passes on the deployed console with the `example` project:
  - The blocked number is the same on Projects, the Board and the Focus view, and the Team figure follows the same rule.
  - Progress does not change with "Show closed".
  - No owner is shown as an assignee, and each person is listed once.
  - "Me" works.
  - A milestone bead reads its milestone status, and late reads the same on every page.
  - Dates follow one format.
  - The Legend opens at 390px.
  - The PM labels read as listed.
