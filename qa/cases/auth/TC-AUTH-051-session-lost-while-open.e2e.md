# TC-AUTH-051: Session lost while open

- **REQ:** REQ-AUTH-015@e644da71
- **Priority:** high

**Preconditions:**
- The console runs with auth on, projects `alpha` and `beta`, and user `an` with projects `[alpha]`
- `an` is signed in and the Beads page of `alpha` is open

**Test data:**
- Credentials: the user name in `GIN_E2E_AUTH_USER` and the password in `GIN_E2E_AUTH_PASSWORD`

**Steps:**
1. The server answers the next data request with 401
2. Open the Beads page again
3. Sign in again

**Expected:**
- The sign-in screen is shown
- After signing in the Beads page of `alpha` is shown again
