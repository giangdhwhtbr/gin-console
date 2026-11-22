# TC-BEADS-077: Email and handle are one person in the Assignee filter

- **REQ:** REQ-BEADS-023@7ee5b152
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 842dbf66

**Preconditions:**
- Project `example` has beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `ann@example.com`
- The browser holds the email `qa@example.com` in localStorage under `gin-console.email`

**Test data:**
- None

**Steps:**
1. Open `/beads?project=example`
2. Open the Assignee filter

**Expected:**
- The filter lists the people `ann` and `giangdhwhtbr`, once each
- The filter does not list `GiangDHWHTBR@gmail.com` or `ann@example.com`
