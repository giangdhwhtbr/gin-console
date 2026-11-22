# TC-BEADS-079: Me by handle or email

- **REQ:** REQ-BEADS-024@be8b68ca
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** 35c12905

**Preconditions:**
- The browser holds the email `giangdhwhtbr@gmail.com` in localStorage under `gin-console.email`
- Project `example` has three beads: one assigned to `giangdhwhtbr`, one to `giangdhwhtbr@gmail.com` and one to `ann`

**Test data:**
- None

**Steps:**
1. Open `/beads?project=example`
2. Open the Assignee filter
3. Select "Me"

**Expected:**
- "Me" is the first option of the Assignee filter
- The bead assigned to `giangdhwhtbr` and the bead assigned to `giangdhwhtbr@gmail.com` remain in the list
- The bead assigned to `ann` is not in the list
- The URL query holds `assignee=me`
