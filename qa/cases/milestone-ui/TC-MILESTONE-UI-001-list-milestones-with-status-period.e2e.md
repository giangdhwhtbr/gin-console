# TC-MILESTONE-UI-001: List milestones with status, period, progress and warnings
REQ: REQ-MILESTONE-UI-001@eeee2b06
Priority: high
Result: passed
Run: qa/evidence/2026-11-23T10-34-33
Checked: b8f3d04d

Preconditions:
- project P whose `milestone list --all --json` reports M1 (active) with `epics` `{total: 6, closed: 2}` and M2 (planned) with 2 warnings

Steps:
1. Open /milestones
2. Select project P
3. Press List in the View row

Expected:
- M1 and M2 are listed
- Each row shows its status with the one status mark (icon and word), start and end, the epic strand, and the warning count
- M1's strand is followed by "2/6" and is named "2 done, 4 ready of 6 epics"
- M2's warnings read "2 warnings" after a dashed ring in the warning colour
- The URL has `project=P`, and `view=list` after step 3
- The list is shown only after step 3 (the Timeline is the default view)
