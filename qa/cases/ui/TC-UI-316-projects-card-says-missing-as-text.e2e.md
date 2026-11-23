# TC-UI-316: My Tasks row shows the state as text

- **REQ:** REQ-UI-140@aa5bbea9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 66129a12

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
