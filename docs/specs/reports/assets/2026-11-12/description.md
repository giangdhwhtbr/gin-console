# reports: 2026-11-12

<!-- description.md of one dated asset folder, docs/specs/<capability>/assets/<YYYY-MM-DD>/, named by the day
     the inputs arrived. Kind: new (first requirements), change (the customer's changes after an earlier folder),
     or legacy (screenshots of an existing feature, kept under legacy/). A new batch of inputs gets a new folder;
     never edit an older one. `gin specs assets add` creates the folder and fills Kind and Previous;
     `gin specs assets confirm` sets Confirmed, adds Confirmed by (the git user.email), and adds Agreed with
     when `--agreed-with` names who else agreed. Confirmed: no until the BA confirms the inputs, then the ISO
     date of that confirmation; a confirmed folder is frozen, and only a confirmed folder is cited as a
     requirement source. -->

Kind: new
Source: discuss of gin-console-slc, 2026-11-12 (user asked for a design published as an artifact)
Previous: none
Confirmed: 2026-11-12
Confirmed by: giangdhwhtbr@gmail.com

## Summary
New Team tab, first in the Reports page: one milestone of one project at a time, its beads Open / In progress / Closed, a member filter, and the team's KPIs for that milestone (progress, pace against the pace needed, work in progress, cycle time, on time, rework), per member and for the team.

## Changes
- Tab bar: Team first with a headline for the selected milestone; Delivery, AI usage, Quality and Data coverage follow.
- Team panel: Milestone select (grouped Active, Planned, Closed), Member select with bead counts, "Clear member", "Open Gantt"; no period or sprint.
- Milestone line: title, status chip, dates, working day n of m and days left.
- KPI strip: Done, In progress (oldest), Open (blocked, unclaimed), Pace with pace needed (Throughput when a member is selected or the milestone is closed), Median cycle, On time, Rework.
- Scope by status bar; Closed per working day chart stacked by member with Today and End markers; Team KPI table (a row click filters by that member); Beads table with Open, In progress, Closed and All, columns per status, sortable, 15 rows at a time.
- All projects: "Pick a project to see its team". A project without milestones: an empty state with `gin-workflow milestone create`.
- Delivery tab: "Oldest in progress", "In progress by member" and the "In progress now" figure are removed.

## Files
| File | Shows |
|---|---|
| `mockup/index.html` | Interactive mockup with sample data. The "Mockup controls" bar (project state, theme) and the dashed "Mockup note" box are not part of the design. |
| `team-active.png` | Team tab, active milestone, all members |
| `team-member.png` | Team tab, active milestone, filtered by one member |
| `team-closed.png` | Team tab, closed milestone that finished late, Closed beads |

## Open questions
