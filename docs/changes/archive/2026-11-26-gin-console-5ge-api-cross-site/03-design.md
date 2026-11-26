# Design: Refuse cross-site API requests

Epic: gin-console-5ge

## Architecture

- `backend/src/gin_console/app.py`: one HTTP middleware, added in `create_app` beside the gzip middleware, so it runs before every router and before the SPA fallback.
  - It reads the header `sec-fetch-site` and the route path: `scope["path"]` without `scope["root_path"]`, the decoded path the router matches, so the check also holds behind a proxy with a root path. Not `request.url.path`, which Starlette cuts at a decoded `?` or `#`.
  - It refuses when the path starts with `/api/` and the value is `cross-site` or `same-site`, unless the method is GET and the path starts with `/api/requirements/mockups/` and has `/files/` as its third segment after `mockups` (`/api/requirements/mockups/<project>/files/...`).
  - A refusal is `JSONResponse(status_code=403, content={"error": "cross-site request refused"})`.
- Nothing else changes: the mockup CSP, the sandbox and the file checks of ADR 0004 stay.
- `docs/adr/0004-serve-project-files.md`: Consequences name the guard; no new ADR, since the guard completes that decision.

## Data Flow

No diagram: one check on the way in. The console page sends `same-origin`; a typed address sends `none`; a mockup or another site sends `cross-site`, another port of the same host `same-site`.

## Error Handling

- The 403 body names no path and no project.
- A missing or unknown header value is treated as before, so tools, tests and older browsers keep working.

## Testing

- **pytest (REQ-SERVER-012):** each header value with a GET endpoint and with `POST /api/refresh` (the pull runner is a fake and must not be called); the mockup file exception for GET only and only under `.../mockups/<project>/files/`; a non-API path is never refused; the body.
- **e2e (REQ-REQUIREMENTS-011):** TC-REQUIREMENTS-037 adds an `<img>` and a `<script src>` to `/api/projects/beads` in its mockup and checks that the server log has no such request reaching the endpoint (a refused request is logged with 403).
- **TC-1:** the Tailscale build after restart: the console works, the mockups render with their CSS and images.

## Open Technical Questions
