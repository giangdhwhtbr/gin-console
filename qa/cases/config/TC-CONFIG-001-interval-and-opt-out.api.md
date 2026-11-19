# TC-CONFIG-001: Interval and opt-out

- **REQ:** REQ-CONFIG-006@de736f94
- **Priority:** high

**Preconditions:**
- The config holds the text under Test data

**Test data:**
- `beads: {pull_interval: 5m}`
- `projects: [{name: a, path: /tmp/a, pull: false}]`

**Steps:**
1. Load the config and start the console

**Expected:**
- The pull interval is 300 seconds
- Project a is left out of pulls
