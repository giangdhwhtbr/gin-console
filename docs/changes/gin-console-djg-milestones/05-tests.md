# Tests: Milestones

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | case | evidence |
|---|---|---|---|---|
| TC-1 | REQ-MILESTONE-UI-001 | manual | Milestones list for a real project matches `gin-workflow milestone list --all --json` (status, period, progress, warnings, unassigned count) | ok, 2026-10-31, scratch project `trial`; follow-up asked: list the epics outside any milestone, not only their count |
| TC-2 | REQ-MILESTONE-UI-003 | manual | Gantt bars, weekends, today and end lines match `gin-workflow milestone show <id> --json`; laptop and phone, light and dark | ok, 2026-10-31, scratch project `trial` |
| TC-3 | REQ-MILESTONE-UI-004 | manual | Picking a kick-start date redraws a preview that matches `show <id> --start <date> --json`; Copy puts the kickstart command on the clipboard; Reset returns | ok, 2026-10-31, scratch project `trial` |
| TC-4 | REQ-MILESTONE-UI-002 | manual | Graph tab shows the milestone's epics and an epic of another milestone as a dashed node | ok, 2026-10-31, scratch project `trial` |
| TC-5 | REQ-MILESTONE-UI-009 | manual | No milestone bead on the Beads List, Board, Focus and Dependencies views; its epics are top-level | ok, 2026-10-31, scratch project `trial` |
| TC-6 | REQ-MILESTONE-UI-005 | manual | A project on markdown tracking shows the tracking error on the Milestones page | ok, 2026-10-31, project `qwikfone` |
