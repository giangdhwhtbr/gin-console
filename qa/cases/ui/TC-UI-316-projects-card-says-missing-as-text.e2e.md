# TC-UI-316: My work row shows the state as text

- **REQ:** REQ-UI-140@50e14546
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b2a62ed9

**Preconditions:**
- Project `P` reports a blocked bead assigned to the signed-in email
- The window is 1440px wide

**Steps:**
1. Open `/my-tasks?project=P`
2. Find the row of the blocked bead
3. Read the computed border and background of its state

**Expected:**
- The row shows its state "Blocked" as text
- The state has no border and no background colour (no pill or tint)
