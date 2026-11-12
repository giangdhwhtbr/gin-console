# TC-UI-027: Change tab

- **REQ:** REQ-UI-095@bd16d69a
- **Priority:** medium

**Preconditions:**
- The Reports page for `alpha`, 90 days and the Delivery tab

**Test data:**
- None

**Steps:**
1. Pick the AI usage tab

**Expected:**
- The URL becomes `/reports?project=alpha&days=90&tab=usage` without a reload and no new report is requested
