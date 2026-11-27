# TC-AUTH-048: Styled mockup through the grant

- **REQ:** REQ-AUTH-016@9b0a0c99
- **Priority:** high

**Preconditions:**
- The console runs with auth on, projects `alpha` and `beta`, and user `an` with projects `[alpha]`; `alpha` has a confirmed mockup `ui/2026-11-22` with `index.html` and `style.css`
- `an` is signed in

**Test data:**
- Credentials: the user name in `GIN_E2E_AUTH_USER` and the password in `GIN_E2E_AUTH_PASSWORD`

**Steps:**
1. Open `/requirements/mockups?project=alpha&mockup=ui/2026-11-22`

**Expected:**
- The mockup frame loads from a grant path of its folder
- The frame's heading has the colour `style.css` sets
