# Shared bead attachments

Epic: gin-console-rm-shared-attachments
Kind: capability
Points: 5 (5 new and 8 modified REQs: attachment references and entries with the attachment and `local:` pair as one image, a fetch of the shared store into the console's own ref beside the pull, one endpoint with hash, type and size checks, reasons in the Images panel, one fetch note, a new ADR; same size as gin-console-rm-evidence-images = 5; was 3 at the roadmap)
Date: 2026-11-27

## Why

Evidence images (shipped 2026-11-27, merge `a69f4df`) shows a bead's screenshots only when the files sit on the console host. gin-qa and `gin attach add` now put each screenshot in a shared store: the bead lists it in `metadata.attachments`, its text points at it as `![caption](attachment:<sha256>)`, and the blob is pushed to `origin` on `refs/gin/attachments`. The console drops every `attachment:` address on purpose (REQ-BEADS-026, REQ-UI-028), so a screenshot taken on another machine never shows, and a gin-qa bug lists each screenshot twice in its text, once as the attachment and once as a `local:` path that only one machine has.

Goal and scope after the epic's comments: Everyone on the team sees a bead's screenshots, whoever took them. The console reads `metadata.attachments` and resolves `attachment:<sha256>` in the description and notes; it fetches the shared store on refresh and on schedule, a second exception to read-only recorded in ADR 0006; it serves each attachment after checking its hash, type and size, with immutable caching; and it reuses the Images panel and the lightbox of Evidence images. `gin attach` shipped in gin-workflow (gin-workflow-s6fv, master `7d6f38f0`, documented for gin 3.5.0; this host has gin 3.5.4) with a reader contract: fetch `refs/gin/attachments`, read blobs at `<aa>/<sha256>` with `git cat-file`; entries carry `sha256`, `name`, `mime`, `bytes`, `caption`, `case`, `step`, `added_by`, `added_at`, `store`, `path` and `pruned_at`. Evidence images shipped with the panel, the lightbox and an explicit rule that drops `attachment:` addresses, which this change replaces.

Comments considered: 2, latest 2026-11-27T00:27:51Z

Facts measured on 2026-11-27:
- No bead in gin-console, gin-workflow or gin-harness has `metadata.attachments` yet, and neither `origin` of gin-console nor of gin-workflow has `refs/gin/attachments`; tests use hand-written fixtures.
- The reader contract's forced fetch into `refs/gin/attachments` drops the blobs not pushed yet of a clone that writes attachments (gin-workflow `docs/reference/cli.md`, `gin attach`), and `refs/gin/attachments-origin` holds the remote tip that gin's prune detection relies on (`attach_gitref.py`). The projects the console reads are such clones.
- gin attach stores: `git-ref` (default), `local` (`.agent-workflow/attachments/<aa>/<sha256>` of the main checkout) and `s3`.
- gin-qa writes `- ![<TC-ID> step <n>: <title>](attachment:<sha>)` and `  local: <path>` per screenshot in a bug's `## Evidence`.
- The Docker image installs git; the backend runs no git command today.

User decisions 2026-11-27:
- **Pairs:** an `attachment:` image and the `local:` line right under it are one image: shown from the attachment when present, else from the local file.
- **Stores:** `git-ref` and `local` are read; an entry of the `s3` store shows as not readable here.
- **Fetch target:** the console fetches into its own ref `refs/gin-console/attachments` in the project's clone, after `bd dolt pull`, and reads `refs/gin/attachments` first; it never moves gin's refs. A bare cache per project and `gin attach fetch` were rejected (ADR 0006).

Assumptions (defaults taken without a question):
- A project's `path` in the config is its main checkout, where the `local` store lives.
- The fetch follows the pull's opt-out (`pull: false`), limits (30 seconds, four projects at a time) and display pattern (a note on the Beads and My Tasks pages); `no_store` and `no_remote` show no note.
- An `attachment:` reference resolves only through an entry of the same bead; the entry's `path`, `mime` and `bytes` are not trusted, and blobs are checked when served (SHA-256, PNG, JPEG, GIF or WebP by first bytes, at most 10 MB).
- Entries the text does not name follow the named images in the panel, within the limit of 50 images.
- `case`, `step`, `added_by` and `added_at` of an entry are not shown.
- No test starts git (AGENTS.md); the real git contract is checked by a manual QA case.

## What Changes

- **Backend:** each image may be an attachment (`sha256`), a file (`path`) or both; images get `served_as` and `reason`; the store is listed once per snapshot; `GET /api/beads/{project}/{id}/attachments/{sha256}` serves a checked blob with immutable caching; the pull pass fetches the store and keeps `attachments_fetch` per project.
- **Bead page, epic page and details panel:** attachment images inline and in the Images panel and lightbox; tiles of missing attachments say why; a tile whose image fails to load shows its caption.
- **Beads and My Tasks pages:** a note when the fetch of the current project failed.
- **ADR 0006:** the second exception to read-only.

## User Stories

### US-1: See screenshots taken on another machine
As a developer triaging a bug, I want the screenshots a teammate or an agent attached to it on another machine shown on its page, so that I see what failed without asking for the files.
REQ: REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-029, REQ-BEADS-030, REQ-BEADS-031, REQ-BEADS-032, REQ-BEADS-033, REQ-UI-028

Acceptance criteria:
- After a teammate runs `gin attach add` on a bug, pushes the store and the beads, and this host refreshes, the bug's page shows the screenshot in its description and as a tile of the Images panel, and the lightbox opens it.
- A screenshot attached on this host and not pushed yet shows too.
- Each screenshot of a gin-qa bug shows once, not once for the attachment and once for its `local:` line.

### US-2: Know why a screenshot is missing
As a QA, I want a missing screenshot to say why, so that I know whether to refresh, push or ask.
REQ: REQ-BEADS-029, REQ-BEADS-031, REQ-BEADS-034, REQ-UI-132

Acceptance criteria:
- A tile reads "Not fetched yet", "Pruned", "Stored where this host cannot read it" or "Not attached to this bead", and shows the `local:` path when there is one.
- When the fetch of the current project fails, the Beads and My Tasks pages show the error and the `git fetch` command to run by hand.
- The image indicator's tooltip says that it counts files on the console host and attachments in the shared store.

### US-3: Safe shared screenshots
As the owner of a project, I want the console to serve only checked images and to leave my attachment store alone, so that a bad blob cannot run in the browser and my unpushed attachments are never lost.
REQ: REQ-BEADS-032, REQ-BEADS-035

Acceptance criteria:
- A blob whose SHA-256 differs from its name, that is not a PNG, JPEG, GIF or WebP, or that is over 10 MB is never served.
- The console never changes `refs/gin/attachments` or `refs/gin/attachments-origin`, never pushes and never runs `gin attach`.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `beads` | `REQ-BEADS-031`, `REQ-BEADS-032`, `REQ-BEADS-033`, `REQ-BEADS-034`, `REQ-BEADS-035`; modified `REQ-BEADS-002`, `REQ-BEADS-026`, `REQ-BEADS-027`, `REQ-BEADS-028`, `REQ-BEADS-029`, `REQ-BEADS-030` | `docs/specs/beads/diagrams/shared-attachments-activity.md`, `docs/specs/beads/diagrams/attachment-image-state.md`, `docs/specs/beads/diagrams/attachments-fetch-state.md`, `docs/specs/beads/use-cases/see-shared-screenshots.md` |
| `ui` | modified `REQ-UI-028`, `REQ-UI-132` | none |

Decision: `docs/adr/0006-console-fetches-attachments.md`.

## Non-goals

- Uploading, captioning or pruning attachments from the console.
- The `s3` store.
- Showing an entry's `case`, `step`, `added_by` or `added_at`.
- Attachments in comments.

## Success Criteria

- A screenshot attached with `gin attach add` on one clone of gin-console and pushed shows, after Refresh, on the console of another host that reads a different clone.
- With a recording git runner, a refresh, a list, a bead page and an attachment request start only the three git commands of REQ-BEADS-035, and a project without git-ref entries starts none on reading.
- `pytest`, `ruff`, `mypy`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test, and `gin-qa cases check --change gin-console-rm-shared-attachments` prints `ok`.
