# TC-UI-090: From a milestone page

- **REQ:** REQ-UI-072@f6caddae
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** ac13997a

**Preconditions:**
- Project `a` with milestone `m2` titled "Checkout v2" and bead `a-1` under it

**Steps:**
1. Open `/milestones/a/m2?tab=beads&view=board&status=open`
2. Open the bead page of `a-1`

**Expected:**
- The breadcrumb reads "Checkout v2 › Board, 1 filter" then the title of `a-1`
- The first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`
