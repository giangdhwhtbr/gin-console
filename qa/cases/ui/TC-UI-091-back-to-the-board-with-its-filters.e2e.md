# TC-UI-091: Back to the Board with its filters

- **REQ:** REQ-UI-073@9e85a65b
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** f64b58d4

**Preconditions:**
- Project `a` with open beads

**Steps:**
1. Open `/beads?project=a&view=board&status=open`
2. Open a card
3. Use the first link of the breadcrumb

**Expected:**
- The Board is shown with the filter status "open"
