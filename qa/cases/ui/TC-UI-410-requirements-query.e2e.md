# TC-UI-410: Requirements query

- **REQ:** REQ-UI-126@3abbb248
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T02-30-19
- **Checked:** 5866d7b5

**Preconditions:**
- Projects `a` and `b` are configured

**Steps:**
1. Open `/requirements/matrix?project=zzz`

**Expected:**
- The page says "No project zzz is configured" with links to `/requirements/matrix?project=a` and `/requirements/matrix?project=b`
- No requirements are shown
