# TC-REQUIREMENTS-055: Unknown change

- **REQ:** REQ-REQUIREMENTS-017@53b23f04
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** 58f7ba50

**Preconditions:**
- No change named `nope`

**Steps:**
1. Open `/requirements/changes/nope?project=a`
2. Choose the link "Changes"

**Expected:**
- The page says the change was not found
- The link leads to `/requirements/changes?project=a`
