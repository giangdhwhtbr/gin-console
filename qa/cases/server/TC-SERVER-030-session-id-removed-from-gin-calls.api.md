# TC-SERVER-030: Session id removed from gin calls

- **REQ:** REQ-SERVER-014@61abaa76
- **Priority:** medium

**Preconditions:**
- The console runs with `CLAUDE_CODE_SESSION_ID=abc` in its environment

**Steps:**
1. Make the console run `gin state`

**Expected:**
- The child process has no `CLAUDE_CODE_SESSION_ID`
- The rest of the environment is unchanged
