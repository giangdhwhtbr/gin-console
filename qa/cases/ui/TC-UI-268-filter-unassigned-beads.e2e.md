# TC-UI-268: Filter unassigned beads

- **REQ:** REQ-UI-082@5a1bd944
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9c212425

**Preconditions:**
- Project `alpha` has a bead assigned to `alice@example.com`, a bead without assignee, and a bead without assignee whose owner is `lead@example.com`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Open the "Assignee" filter
3. Select "Unassigned"

**Expected:**
- Only the two beads without an assignee are shown, the one with an owner included
- The URL query contains `assignee=unassigned`
