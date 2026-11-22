# TC-UI-091: Back to the Board with its filters

- **REQ:** REQ-UI-073@99c2938a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** c40224df

**Preconditions:**
- Project `a` with open beads

**Steps:**
1. Open `/beads?project=a&view=board&status=open`
2. Open a card
3. Use the first link of the breadcrumb

**Expected:**
- The Board is shown with the filter status "open"
