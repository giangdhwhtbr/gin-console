# Design: Requirements and traceability

Epic: gin-console-rm-requirements

## Architecture

A new bounded context (ADR 0001); file serving follows `docs/adr/0004-serve-project-files.md`.

Backend, `backend/src/gin_console/requirements/`:
- `models.py`: the pydantic models of the responses.
- `source.py`: runs `gin specs trace --all --format json` and `gin specs reqs --format json` through `run_json` (30 seconds, Windows shim included) and maps failures to a cause, like `milestones/source.py`. It is the only module that knows this JSON.
- `files.py`: the only module that reads project files, and the only path check; it lists changes and confirmed asset folders.
- `service.py`: status, sign-off and change counts, pure functions.
- `router.py`: the endpoints, with a `KeyedCache` per command (60 seconds), cleared by `on_refresh`.

`create_app` gets an injected runner, so tests never start gin. `beads/` and `milestones/` are not edited.

Frontend, `frontend/src/features/requirements/`:
- The sections, the change page, the details panel and a section store like `features/reports/sectionStore.ts`.
- `MarkdownView` renders Markdown; the table and status components are the existing ones.
- `app/` gains the link in `Layout.tsx`, the routes in `App.tsx`, the path in `project.ts`, and the `requirements` kind in `origin.ts`.

## Data Flow

- `docs/specs/requirements/diagrams/matrix-activity.md`
- `docs/specs/requirements/diagrams/changes-activity.md`
- `docs/specs/requirements/diagrams/mockups-activity.md`

`gin specs trace --all` supplies requirements, sign-off, beads, cases and tests; `gin specs reqs` adds scenarios. gin itself calls `bd list` and `gin-qa`, so the console starts neither. The project summary endpoints still start no process (REQ-SERVER-006, REQ-SERVER-010).

Trace contract, schema 1: `requirements[]` with `id`, `title`, `capability`, `state`, `hash8`, `source`, `changes[]`, `signoff`, `beads[] | null`, `cases[] | null`, `tests[]`; plus `layout`, `warnings`, `skipped`. Unknown extra keys are ignored.

## Error Handling

- gin missing, old, slow or not understood: 502 with `error` and `cause`; the other endpoints keep working.
- Null beads or cases are shown as unknown, never as empty.
- A file that cannot be read or is not UTF-8 is replaced by an error text in its tab; a path outside the allowed folders is 404.

## Testing

- **pytest by REQ:** fixtures taken from real gin 3.5.3 output; the status table and its order; null sources; old gin, timeout, schema; cache; path checks and headers.
- **vitest by REQ:** filters and URL, panel, tabs, empty states, the iframe `sandbox`, navigation and titles.
- **gin-qa:** cases under `qa/cases/requirements/` and e2e specs, one proving that a mockup script cannot reach the API.
- **TC-1:** Playwright on the Tailscale build (05-tests.md).

## Open Technical Questions
