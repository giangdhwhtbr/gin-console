# TC-UI-051: Unsafe link

- **REQ:** REQ-UI-028@5a22703b
- **Priority:** high

**Preconditions:**
- Bead `b-1` in project `alpha` has a description containing `[run](javascript:alert(1))` and `[docs](https://example.com)`

**Steps:**
1. Open `/beads/alpha/b-1`

**Expected:**
- "run" is not a link
- "docs" links to `https://example.com` in a new tab
