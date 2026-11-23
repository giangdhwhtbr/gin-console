# TC-UI-086: Place and filters

- **REQ:** REQ-UI-072@6a1a0b98
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 35ecf058

**Preconditions:**
- Project `a` with bead `a-1` titled "Fix login"

**Steps:**
1. Open `/beads?project=a&view=board&status=open&q=fix`
2. Open the bead page of `a-1`

**Expected:**
- The breadcrumb reads "Beads › Board, 2 filters" then "Fix login"
- The first link goes to `/beads?project=a&view=board&status=open&q=fix`
