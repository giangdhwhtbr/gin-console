# Design: Mockup grant per folder and strict mockup CSP

Epic: gin-console-dbt

## Architecture

Backend:
- `auth/sessions.py`: `Session` gains `grant_key: bytes`, from `secrets.token_bytes(32)`. `grant` stays the grant id and `by_grant(grant_id)` is unchanged.
- `auth/access.py`:
  - `folder_grant(session, project, capability, date) -> str` returns `f"{session.grant}.{b64url(hmac.new(session.grant_key, f'{project}/{capability}/{date}'.encode(), sha256).digest())}"`, unpadded.
  - `user_of_folder_grant(token, project, capability, date) -> User | None` splits on the last `.`, looks the session up by id, and checks the mac with `hmac.compare_digest`.
- `app.py`:
  - `_GRANT_FILES` also captures `capability` and `date`: `/api/requirements/mockups/([^/]+)/g/([^/]+)/files/([^/]+)/([^/]+)/`.
  - Path parts are percent-decoded the same way the router decodes them; `route_path` already gives the decoded path.
  - The middleware calls `user_of_folder_grant` and sets `request.state.session` and `request.state.user`.
- `requirements/models.py`: `Mockup.grant: str | None = None`.
- `requirements/router.py`:
  - `get_mockups` takes `request` and fills `grant` from `request.state.session` when auth is on.
  - The grant route keeps its `via_grant` check against the token in the path.
  - `POLICY` becomes the REQ-REQUIREMENTS-011 value.
- `auth/router.py`: `UserOut` drops `mockup_grant`.

Frontend:
- `features/requirements/api.ts`: the `Mockup` type and guard gain `grant: string | null`, and accept it missing for older servers.
- `features/requirements/paths.ts`: `mockupFileHref(project, capability, date, path, grant?: string | null)` uses `g/<grant>/` when `grant` is a string. It no longer reads the session.
- `features/requirements/MockupsSection.tsx:30`: passes `mockup.grant`.
- `app/session.ts`: `SessionUser` and `parseUser` drop `mockup_grant`.

## Data Flow

- [Mockup grant activity](docs/specs/auth/diagrams/mockup-grant-activity.md).
- [Project access activity](docs/specs/auth/diagrams/project-access-activity.md) is unchanged for every other route.

## Error Handling

- A grant without a `.`, an unknown id, a wrong mac, a grant of another folder or project, a session token in place of the grant, or auth off: all answer the same 404 `{"error": "not found"}`. None of them reaches the router.
- `b64url` decoding is not needed: the mac is compared as text with `compare_digest`, after a length check.

## Testing

- `test_auth_sessions.py`: `grant_key` length, and that it differs from the token and from the grant id.
- `test_auth_access_api.py`, `test_auth_api.py`: the REQ-AUTH-016 scenarios, including another folder of the same project; REQ-AUTH-002 checks that there is no `mockup_grant`.
- `test_requirements_*_api.py`: REQ-REQUIREMENTS-009 `grant` per folder, `null` while auth is off; REQ-REQUIREMENTS-011 the exact CSP header on HTML, CSS and SVG responses.
- vitest: `paths.test.ts` with and without a grant; `MockupsSection` passes the mockup's grant; `session.test.ts` drops the `mockup_grant` cases.
- QA:
  - TC-AUTH-048 loads a styled mockup through its folder grant.
  - A new e2e case shows that an outside image in a mockup is not requested.
  - The stale cases of the four REQs are pinned again.

## Open Technical Questions
