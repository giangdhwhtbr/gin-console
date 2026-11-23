# TC-UI-077: Prep task in the scope

- **REQ:** REQ-UI-049@73f03f4c
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 7c2614d0

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `t-1` (closed) and `t-2` (open) and prep task `p-1` (open) labelled `prep` and `prep:mockup`

**Steps:**
1. Open `/beads/alpha/e-1?tab=graph&closed=1`

**Expected:**
- `t-1`, `t-2` and `p-1` are nodes
- The node `p-1` shows the word "Prep"
- The nodes `t-1` and `t-2` do not show the word "Prep"
