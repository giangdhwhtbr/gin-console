# TC-UI-394: Jump palette names a project that fails

- **REQ:** REQ-UI-154@7989ca73
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Projects `a` and `b`; the beads request of `b` fails; bead `a-1` is in `a`

**Steps:**
1. Open `/beads?project=a` and press Ctrl+K
2. Type `a-1`

**Expected:**
- The bead `a-1` is listed
- The dialog says "Could not load b"
