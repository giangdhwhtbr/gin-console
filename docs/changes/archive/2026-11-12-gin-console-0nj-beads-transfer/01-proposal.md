# Beads transfer

Epic: gin-console-0nj
Date: 2026-11-12

## Why

The Beads page reloads `GET /api/beads` every 10 seconds per open tab (REQ-UI-027). Since gin-console-vqc the endpoint reads the `bd export` snapshot and answers in 3 to 13 ms without running `bd`. The transfer is now the cost: on 2026-11-12, `qwikfone` with "Show closed" sent 269 KB each time, uncompressed, even when no bead had changed, which is heavy for a phone on Tailscale.

The epic was written on 2026-10-23, when each call ran three `bd` processes (about 1.3 s). Its server-side cache is no longer needed: the snapshot store already rereads a project only when its export file changes (REQ-BEADS-012). Its slower polling would delay the screen and is dropped too.

## What Changes

- The server compresses every response of at least 1 KB with gzip when the client accepts it, the UI's JavaScript and CSS included.
- `GET /api/beads` carries a weak `ETag` computed from its body and `Cache-Control: no-cache`, and answers 304 without a body when the request's `If-None-Match` matches. The browser sends `If-None-Match` and reuses its copy on its own, so the frontend does not change.

## User Stories

### US-1: The bead list costs little to keep fresh
As a console user on a phone, I want the Beads page's reloads to send little or nothing when no bead changed, so that a tab left open does not use my data plan.
REQ: REQ-BEADS-014, REQ-SERVER-011

Acceptance criteria:
- A reload of an unchanged bead list answers 304 without a body.
- A changed list, or a change of "Show closed", answers 200 with the new list.
- The 269 KB list of `qwikfone` with closed beads travels gzip-compressed, at about a tenth of its size.

### US-2: The console loads faster over a slow link
As a console user on a slow link, I want the server to compress its answers, so that pages and data load faster.
REQ: REQ-SERVER-011

Acceptance criteria:
- A response of at least 1 KB to a client that sends `Accept-Encoding: gzip` has `Content-Encoding: gzip`.
- A smaller response, or one to a client that does not accept gzip, is sent as before.

## Capabilities Affected

- `server`: ADDED REQ-SERVER-011.
- `beads`: ADDED REQ-BEADS-014.
  - Diagram: `docs/specs/beads/diagrams/bead-list-transfer-activity.md`.
- Assets: none. No use case: the change has no new actor interaction; the browser handles revalidation.

## Non-goals

- A server-side cache for `/api/beads`: the snapshot store already avoids rereading an unchanged export (REQ-BEADS-012).
- Changing the 10-second reload (REQ-UI-027 is unchanged).
- ETags on other endpoints, and pagination (revisit when a project passes a few thousand beads).
- Any frontend change.

## Assumptions

- Browsers revalidate a response marked `Cache-Control: no-cache` that has an `ETag` by sending `If-None-Match`, and give `fetch` the cached body with status 200 after a 304. This holds for the default `fetch` cache mode the frontend uses (`frontend/src/features/beads/api.ts`).
- The ETag is weak (`W/"…"`) because gzip changes the bytes sent while the content is the same.
- 1 KB is the gzip threshold, Starlette's default; smaller bodies gain little.

## Success Criteria

- Every scenario of REQ-SERVER-011 and REQ-BEADS-014 has a test naming its REQ.
- `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass.
- On the Tailscale deploy, with "Show closed" on, the polls of `/api/beads` answer 304 while no bead changes, and the first answer is gzip-compressed (TC-1).
