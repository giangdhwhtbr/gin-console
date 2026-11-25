# TC-REQUIREMENTS-053: Missing plan

- **REQ:** REQ-REQUIREMENTS-017@53b23f04
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 87231f9b

**Preconditions:**
- A change has a proposal and a spec delta and no plan

**Steps:**
1. Open `/requirements/changes/<change>?project=a`

**Expected:**
- The tabs Proposal and Spec delta are shown
- There is no Plan tab
