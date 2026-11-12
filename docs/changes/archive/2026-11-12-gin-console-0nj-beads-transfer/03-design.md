# Design: Beads transfer

Epic: gin-console-0nj

## Architecture

Backend only; no new dependency.

- `backend/src/gin_console/app.py`: `create_app` adds `GZipMiddleware(minimum_size=1000)` from `starlette.middleware.gzip` (Starlette 1.7) on the root app, so it covers `/api/*` and the built frontend (REQ-SERVER-011).
- `backend/src/gin_console/beads/router.py`: `get_beads` builds the list as today, serializes it once with the response model (`TypeAdapter(list[BeadSummary]).dump_json`), takes the first 16 hex characters of its SHA-256 as the tag, and returns a `Response` with `ETag: W/"<tag>"` and `Cache-Control: no-cache`, or 304 with the `ETag` when `If-None-Match` names it (REQ-BEADS-014). The tag check accepts a comma-separated list, the weak and strong forms of the same tag, and `*`. The 404 and 502 paths are unchanged.
- The frontend is unchanged: `fetchBeads` uses the default `fetch` cache mode, so the browser sends `If-None-Match` and turns a 304 into its cached 200.

## Data Flow

See `docs/specs/beads/diagrams/bead-list-transfer-activity.md`.

1. The browser sends `GET /api/beads?project=P[&closed=1]` with `If-None-Match` when it holds an earlier answer.
2. The router reads the snapshot (REQ-BEADS-012) and builds the list.
3. It serializes the list and computes the tag. A match answers 304, and anything else answers 200 with the body.
4. `GZipMiddleware` compresses a 200 body of at least 1000 bytes when the request accepts gzip. A 304 has no body to compress.

## Error Handling

- 404 (unknown project, missing directory) and 502 (unreadable export) keep their current bodies and carry no `ETag`, so a browser never revalidates an error.
- An `If-None-Match` that names no current tag, is malformed, or is empty answers 200 with the body; the header is only compared, never trusted.

## Testing

- `backend/tests/test_beads_transfer.py`: with the `TestClient` and fake exports (`fake_export.py`), one test per scenario of REQ-SERVER-011 and REQ-BEADS-014, each named with its REQ. Gzip tests send `Accept-Encoding` explicitly and read the raw `Content-Encoding` header.
- Existing `/api/beads` tests keep passing unchanged (the body is the same JSON).
- Manual TC-1 on the Tailscale deploy: DevTools shows 304 for the reloads of an unchanged list with "Show closed" on, and a gzip first answer.

## Open Technical Questions
