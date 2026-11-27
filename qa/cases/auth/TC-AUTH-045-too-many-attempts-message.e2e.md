# TC-AUTH-045: Too many attempts message

- **REQ:** REQ-AUTH-014@b775df24
- **Priority:** high

**Preconditions:**
- The console runs with auth on and the default limit of 5 failures per user in 15 minutes
- No session

**Test data:**
- User name: a name no one has failed with in the window and that has no account, new on each run (the limit counts any name)
- Password: any wrong value

**Steps:**
1. Open the console
2. Enter the user name and the wrong password, then select Sign in, 5 times
3. Enter the user name and the wrong password, then select Sign in a sixth time

**Expected:**
- The first 5 attempts show "Wrong username or password"
- The sixth shows "Too many attempts. Try again in 15 minutes"
