# TC-SERVER-024: Contract check current gin

- **REQ:** REQ-SERVER-013@e810d9f2
- **Priority:** medium

**Preconditions:**
- The installed `gin` matches the console
- A project whose Beads hold a capability epic

**Steps:**
1. Run `check-contract` for the project

**Expected:**
- Each call prints `ok`
- Epic kinds with no epic print `not covered`
- The exit status is 0
