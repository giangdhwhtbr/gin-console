# TC-MILESTONE-UI-128: Zoom changes the day width

- **REQ:** REQ-MILESTONE-UI-036@08976195
- **Priority:** high

**Preconditions:**
- Project `example` with milestone `ex-m2` (active, 16 Nov to 4 Dec 2026) and an epic planned until 2027-02-02

**Test data:**
- Today: 2026-11-26

**Steps:**
1. Open `/milestones?project=example`
2. Press Quarters
3. Press Weeks

**Expected:**
- After step 1: Months has `aria-pressed="true"`, Weeks and Quarters have `aria-pressed="false"`, the URL has no `zoom`, and the `ex-m2` bar is 114 px wide (6 px a day)
- After step 2: the URL has `zoom=quarters`, Quarters has `aria-pressed="true"` and Months has `aria-pressed="false"`
- After step 2: the `ex-m2` bar is 38 px wide (2 px a day) and the axis header reads "Q4 2026" and "Q1 2027"
- After step 3: the URL has `zoom=weeks`, Weeks has `aria-pressed="true"` and the `ex-m2` bar is 456 px wide (24 px a day)
