# TC-UI-092: From bead to bead

- **REQ:** REQ-UI-073@747662fe
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 99b4eaff

**Preconditions:**
- Project `a` with bead `a-1` related to bead `a-2`

**Steps:**
1. Open `/beads?project=a&view=board&status=open`
2. Open the bead page of `a-1`
3. Open `a-2` from the related beads of `a-1`
4. Use the first link of the breadcrumb

**Expected:**
- The Board with the same filters is shown
