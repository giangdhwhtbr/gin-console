# TC-AUTH-047: Project switcher lists only the user's projects

- **REQ:** REQ-AUTH-007@e145510c
- **Priority:** high

**Preconditions:**
- The console runs with auth on, projects `alpha` and `beta`, and user `an` with projects `[alpha]`
- `an` is signed in

**Test data:**
- Credentials: the user name in `GIN_E2E_AUTH_USER` and the password in `GIN_E2E_AUTH_PASSWORD`

**Steps:**
1. Open the project switcher in the sidebar

**Expected:**
- Only `alpha` is listed
- `beta` is not listed
