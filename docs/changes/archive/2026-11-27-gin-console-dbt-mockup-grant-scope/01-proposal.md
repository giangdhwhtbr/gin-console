# Mockup grant per folder and strict mockup CSP

Epic: gin-console-dbt
Kind: capability
Points: 3 (4 modified REQs: a grant derived per mockup folder, the mockup list carrying it, the user object without it, a stricter mockup CSP; one middleware check, one list field, two frontend call sites; anchored on gin-console-hlj = 8 for the whole auth feature)
Date: 2026-11-27

## Why

Follow-up gin-console-3m3 from the review of gin-console-hlj.2. The mockup grant (REQ-AUTH-016) is one bearer token per session in the URL path. A confirmed mockup's script can read `location.href` and send the grant out, and uvicorn's access log records it. The leaked grant then serves the confirmed mockup files of every project the viewer may see, until the session ends.

CSP alone cannot close this, because a sandboxed page with `allow-scripts` can still navigate itself to any URL with the grant in it; CSP has no directive for navigation. What limits the harm is the scope of the grant.

User decisions 2026-11-27:
- **Scope:** one grant per mockup folder (`<project>/<capability>/<date>`). A leaked grant opens only the files of that folder, which the mockup's author already has in the repository.
- **CSP:** mockups load nothing from other origins: `default-src 'self' 'unsafe-inline' data: blob:` on top of the current directives.

Assumptions (defaults taken without a question):
- The grant is `<grant id>.<mac>` with an HMAC-SHA256 under a per-session key that never leaves the server, so the server needs no table of grants.
- The confirmed Reports mockup of 2026-11-12, which loads Geist from Google Fonts, falls back to the browser's fonts.
- The mockup list route has no cache, so returning a per-session `grant` there is safe.

## What Changes

- **Backend:**
  - Sessions gain a grant key.
  - The middleware checks the mac against the path's project, capability and date.
  - The mockup list returns `grant` per folder.
  - `me` and login drop `mockup_grant`.
  - The mockup CSP is stricter.
- **Frontend:** `mockupFileHref` takes the mockup's grant. `SessionUser` drops `mockup_grant`.
- **QA:** the grant and CSP cases are updated, and the stale cases are pinned again.

## User Stories

### US-1: A leaked mockup grant opens only that mockup
As an operator, I want a mockup's grant to open only the files of that mockup, so that a script in one mockup cannot read the mockups of projects its author cannot see.
REQ: REQ-AUTH-016, REQ-REQUIREMENTS-009, REQ-AUTH-002

Acceptance criteria:
- Each confirmed mockup in the list has its own grant.
- A grant of one folder answers 404 for any other folder or project.
- The signed-in user object carries no grant.
- Mockups still load with their styles while signed in.

### US-2: Mockups do not reach other sites
As a console user, I want a mockup to load nothing from other origins, so that opening a mockup sends no request outside the console.
REQ: REQ-REQUIREMENTS-011

Acceptance criteria:
- An image or stylesheet from another origin in a mockup is not requested.
- The mockup's own files, inline styles and scripts still work.

## Capabilities Affected

- `auth`: REQ-AUTH-002, REQ-AUTH-016 (modified).
  - Diagram: `docs/specs/auth/diagrams/mockup-grant-activity.md`.
- `requirements`: REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-011 (modified).

## Non-goals

- Blocking navigation out of a mockup (not possible with CSP).
- Grants that expire before their session.
- Removing grants from the access log.

## Success Criteria

- A grant of `ui/2026-11-22` answers 404 for every other folder and project.
- Mockup responses carry the new CSP, and the existing isolation tests still pass.
- The styled-mockup e2e case passes with auth on.
