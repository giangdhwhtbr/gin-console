# TC-AUTH-049: Sign out returns to sign-in

- **REQ:** REQ-AUTH-014@b775df24
- **Priority:** high

**Preconditions:**
- The console runs with auth on, projects `alpha` and `beta`, and user `an` with projects `[alpha]`
- `an` is signed in

**Test data:**
- Credentials: the user name in `GIN_E2E_AUTH_USER` and the password in `GIN_E2E_AUTH_PASSWORD`

**Steps:**
1. Select Sign out in the header

**Expected:**
- The sign-in screen is shown
- A reload shows the sign-in screen again
