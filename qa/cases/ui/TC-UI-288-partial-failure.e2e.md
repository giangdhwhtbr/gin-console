# TC-UI-288: Partial failure

- **REQ:** REQ-UI-093@d350c545
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** ee149c75

**Preconditions:**
- The answer for "All projects" has `errors` holding `beta` with an error
- The window is 900px wide, so the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=all&tab=delivery`
2. Pick the Quality tab

**Expected:**
- A warning above the tabs names `beta` and its error
- The warning stays after picking the Quality tab
- The sections show the other projects
