# TC-MILESTONE-UI-102: Wide window

- **REQ:** REQ-MILESTONE-UI-013@50a2ef46
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` is active and warns "Spec not confirmed"
- Epic `ex-e3` is in progress with `points: 8`, `estimate_days: 20`, `remaining_days: 11`, 5 of 11 tracks closed and no confirmed spec

**Steps:**
1. Set the window width to 2000 px
2. Open `/milestones/P/M1`

**Expected:**
- The label column is 440 px wide
- The second line of `ex-e3` starts with the id and "8 pt · 11d left" and is cut with an ellipsis inside the column
- The second line does not say "No confirmed spec"
- No text of the label column overlaps a bar or a line
