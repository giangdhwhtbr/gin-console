# TC-AUTH-044: Wrong password message

- **REQ:** REQ-AUTH-014@b775df24
- **Priority:** high

**Preconditions:**
- The console runs with auth on, projects `alpha` and `beta`, and user `an` with projects `[alpha]`
- No session

**Test data:**
- Credentials: the user name in `GIN_E2E_AUTH_USER` and the password in `GIN_E2E_AUTH_PASSWORD`

**Steps:**
1. Open the console
2. Enter the user name and a wrong password
3. Select Sign in

**Expected:**
- "Wrong username or password" is shown
- The user name field keeps its value
- The sign-in screen stays
