# TC-SERVER-029: Contract check unknown project

- **REQ:** REQ-SERVER-013@e810d9f2
- **Priority:** medium

**Preconditions:**
- No configured project `ghost`

**Steps:**
1. Run `check-contract --project ghost`

**Expected:**
- Nothing is printed on stdout
- The message names `ghost`
- The exit status is 2
