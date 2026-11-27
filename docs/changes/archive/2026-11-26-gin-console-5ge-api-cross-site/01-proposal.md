# Refuse cross-site API requests

Epic: gin-console-5ge
Kind: technical
Points: 2 (1 middleware, 1 new and 1 changed REQ, low: one header check)
Date: 2026-11-26

## Why

TC-1 of gin-console-rm-requirements (2026-11-26) found that a mockup can still send GET requests to `/api` through `<img>`: its CSP blocks only `fetch` and XHR (`connect-src 'none'`). The same holds for `<script src>`, `<link>`, fonts and media, and for any other site in the tailnet, which can also post to `/api/refresh` with `mode: "no-cors"`. The answers cannot be read, but the requests reach the endpoints.

A Chromium check on 2026-11-26 showed that every request from a sandboxed mockup, in its frame or in its own tab, carries `Sec-Fetch-Site: cross-site`, while the console's own requests carry `same-origin` and a typed address `none`.

User decision 2026-11-26: refuse cross-site requests on the server (approach A), rather than a path-limited CSP that needs the request host.

## What Changes

- **Server:** a middleware refuses `/api` requests with `Sec-Fetch-Site` `cross-site` or `same-site` (403), except GETs of mockup files.
- **Mockups:** keep their CSP and sandbox; their requests to the rest of `/api` are refused.
- **ADR 0004:** its consequences name the guard.

## Capabilities Affected

- `server`:
  - ADDED: REQ-SERVER-012.
- `requirements`:
  - MODIFIED: REQ-REQUIREMENTS-011.
- Assets: none.

## Assumptions

- **Browsers:** current Chromium, Firefox and Safari send `Sec-Fetch-Site`; a browser that does not is not protected, and nothing breaks for it.
- **One origin:** the console UI and API share one origin; a proxy that serves the API on another origin would need its own rule.
- **Status 403:** a refused request gets a short JSON body that names no path.

## Non-goals

- Authentication, CORS headers, CSRF tokens.
- A path-limited CSP for mockups.

## Success Criteria

- Every scenario of REQ-SERVER-012 and REQ-REQUIREMENTS-011 has a test that names its REQ.
- `gin specs lint --change gin-console-5ge --against master` prints `ok`.
- TC-REQUIREMENTS-037 shows that `<img>` and `<script src>` requests from a mockup reach no endpoint, and the console still works on the Tailscale build.
