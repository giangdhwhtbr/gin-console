# TC-AUTH-043: Sign in with the right password

- **REQ:** REQ-AUTH-014@b775df24
- **Priority:** high

**Preconditions:**
- The console runs with auth on, projects `alpha` and `beta`, and user `an` with projects `[alpha]`
- No session

**Test data:**
- Credentials: the user name in `GIN_E2E_AUTH_USER` and the password in `GIN_E2E_AUTH_PASSWORD`
- The user's email is `<user name>@x.io`

**Steps:**
1. Open the console
2. Enter the user name and the password
3. Select Sign in

**Expected:**
- The console opens
- The header names the user
- My work, with no work to show, says "No work for <the user's email>"
