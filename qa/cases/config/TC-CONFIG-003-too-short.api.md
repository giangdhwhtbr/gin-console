# TC-CONFIG-003: Too short

- **REQ:** REQ-CONFIG-006@de736f94
- **Priority:** medium

**Preconditions:**
- The config holds the text under Test data

**Test data:**
- `beads: {pull_interval: 30s}`

**Steps:**
1. Load the config and start the console

**Expected:**
- It exits non-zero
- The message names `beads.pull_interval`
