# TC-UI-348: Chip with values opens its menu

- **REQ:** REQ-UI-144@6edc5604
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 33ce2fa4

**Preconditions:**
- The Beads page of project `example` at 1440px wide with `status=open,in_progress`

**Steps:**
1. Click the body of the Status chip

**Expected:**
- The chip reads "Status open, in_progress ×" in the identity style
- Its menu opens with "open" and "in_progress" chosen
