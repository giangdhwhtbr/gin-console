# TC-BEADS-051: No scheduled pull by default

- **REQ:** REQ-BEADS-017@a551ebcb
- **Priority:** medium

**Preconditions:**
- The config has no `beads` section
- One project is configured; the `bd` command is replaced by a fake that records every call

**Steps:**
1. Start the server
2. Advance the clock by one hour without sending a refresh

**Expected:**
- The fake `bd` recorded no call
