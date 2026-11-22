# TC-UI-018: Shared link

- **REQ:** REQ-UI-088@086b0a47
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 06b772c4

**Preconditions:**
- The URL `/reports?project=all&days=7&tab=delivery`

**Test data:**
- None

**Steps:**
1. Open `/reports?project=all&days=7&tab=delivery`

**Expected:**
- "All projects" and 7 days are selected and the report for them is requested
