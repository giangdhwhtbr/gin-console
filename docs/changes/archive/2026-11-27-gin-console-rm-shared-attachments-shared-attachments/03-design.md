# Design: Shared bead attachments

Epic: gin-console-rm-shared-attachments

## Architecture

Backend:
- `beads/attachments.py` (new): the only module that knows the attachment store. A `GitRunner` protocol (`__call__(args, cwd, timeout) -> GitRun(returncode, stdout: bytes, stderr: str)`) is injected into `create_app` beside `run_bd`; the real runner reuses the environment, timeout and error mapping of `projects/collect.py` `_run`, but keeps `stdout` as bytes, because `_run` decodes text and a blob is binary. Functions:
  - `fetch(cwd)` runs the `git fetch` of REQ-BEADS-033 and maps its exit code and output to `ok`, `no_store` ("couldn't find remote ref"), `no_remote` ("does not appear to be a git repository") or `error`.
  - `StoreListing.of(entry, snapshot)` runs `git ls-tree -r --name-only` once per ref (`refs/gin/attachments`, `refs/gin-console/attachments`) and keeps the two sets of blob paths with the snapshot, only when a bead of the project has a git-ref entry (REQ-BEADS-031). A missing ref (exit 128) is an empty set.
  - `read_blob(cwd, sha)` runs `git cat-file -s` and then `git cat-file blob` on the first ref that lists `<aa>/<sha>`, refusing a size over 10 MB before reading the bytes; `read_local(entry, sha)` opens `.agent-workflow/attachments/<aa>/<sha>` with the safe open of `images.py` (`_load`, inside the project's `path` only).
  - `served(data, sha)` checks the SHA-256 and the first bytes with `images.media_type`, and the size with `images.MAX_BYTES`.
- `beads/images.py`: `_mentions` also yields `attachment:<sha256>` addresses of Markdown images and links (64 hex digits, lower-cased), and a `local:` line under such an image merges into it; `bead_refs` gets the raw `metadata` and appends the entries the text does not name. `ImageRef` and `FoundImage` gain `sha256: str | None` and `path: str | None`; `FoundImage` gains `served_as` and `reason`. `ImageIndex.of` asks `StoreListing` for the attachment states, so `image_count` (REQ-BEADS-001) still counts `available` without change. `ImageIndex.read(n)` serves only the file of image `n` (REQ-BEADS-028).
- `beads/pull.py`: `PullService._pull` runs the fetch after `bd dolt pull` in the same worker, so the limits and the one-pull-per-project rule of REQ-BEADS-016 hold for both; it keeps a second result map, read by `fetch_result(name)`. The scheduler logs a failed fetch like a failed pull.
- `beads/models.py`: `BeadImage` gains `sha256`, `served_as` and `reason`, and `path` becomes optional. `projects/models.py`: `ProjectBeads.attachments_fetch: FetchResult | None`, where `FetchResult` has `at`, `status` (`ok`, `no_store`, `no_remote`, `error`) and `error`.
- `beads/router.py`: `GET /api/beads/{project}/{bead_id}/attachments/{sha256}`, with `sha256` matching `[0-9a-f]{64}`, the same 404 body and the image headers, and `Cache-Control: private, max-age=31536000, immutable`.
- `AGENTS.md` and `README.md` name the second exception to read-only and point at ADR 0006.

Frontend:
- `features/beads/api.ts`: the new `BeadImage` fields and validators; `imageAddress(project, id, image)` returns the attachment address when `served_as` is `attachment` and `imageUrl(..., n)` when it is `file`.
- `features/beads/images/match.ts`: `findImage` also matches an `attachment:<sha>` address (64 hex digits, any case) by `sha256`, before the path match.
- `MarkdownView.tsx`: the `img` and `a` components use `imageAddress`; an unmatched `attachment:` address stays alt text or plain text, as today.
- `ImagesPanel.tsx`: the reason texts of REQ-BEADS-029, and an `onError` that swaps the `<img>` for the caption; `Lightbox.tsx`: "Open original" from `imageAddress`.
- `lib/definitions.ts`: the image tooltip of REQ-UI-132 names files on the console host and attachments in the shared store.
- The note of REQ-BEADS-034 sits beside the pull note of REQ-BEADS-018 on the Beads and My Tasks pages, reusing its component.

Rules of the change: the browser never sends a path; the console writes no ref but `refs/gin-console/attachments` (ADR 0006); an attachment is served only after its bytes match its name.

## Data Flow

- [Shared attachments activity](docs/specs/beads/diagrams/shared-attachments-activity.md) (use case: [See shared screenshots](docs/specs/beads/use-cases/see-shared-screenshots.md)).
- [Attachment on this host](docs/specs/beads/diagrams/attachment-image-state.md).
- [Attachment fetch status](docs/specs/beads/diagrams/attachments-fetch-state.md).

## Error Handling

- Fetch: a non-zero exit, a timeout (30 seconds), a missing `git` or an `OSError` gives `status` `error` with a short message; it never fails the refresh or the scheduled run, and the scheduled run logs it. `no_store` and `no_remote` are quiet. A fetch runs even when the pull failed.
- Listing: `git ls-tree` failing on a missing ref is an empty set; any other failure (git missing, timeout) counts that ref as empty, skips the ref after it when the first ref failed (so a timeout is not paid twice), logs once, and never fails the list or the bead page; attachments found in neither ref are `not_fetched` for that snapshot.
- `metadata.attachments` that is neither a list nor the JSON text of one, an entry that is not an object, a `sha256` that is not 64 hex digits: ignored. `path`, `mime` and `bytes` of an entry are never used.
- Serving: a malformed `sha256`, a `sha256` not among the bead's images, an entry pruned or in another store, a blob gone since the snapshot, a size over 10 MB (checked with `cat-file -s` before reading), a SHA-256 mismatch or unknown first bytes all answer the one 404. A `local` file is opened once without following a final symlink and checked inside the project's `path`.
- Browser: an `<img>` that gets 404 shows the caption. Immutable caching is safe because the bytes of a `sha256` never change; a blob pruned later may stay in the browser's private cache.

## Testing

- `pytest` with a `FakeGit` in `backend/tests/fake_git.py` (records `args` and `cwd`, answers by command; no test starts git):
  - `test_bead_images.py`: `attachment:` addresses in images and links, the pair with a `local:` line, entries the text does not name, case folding, duplicates, captions in order, bad metadata, the 50 limit across files and attachments.
  - `test_bead_attachments.py`: availability per ref, the four reasons, the `local` store with a symlink out, one listing per snapshot, no git for a project without git-ref entries, and REQ-BEADS-035 over a recorded session.
  - `test_bead_attachments_api.py`: 200 with the headers, a hash mismatch, a text blob, 11 MB, pruned, unlisted, upper case, another bead's `sha256`; `images/{n}` of an attachment without a file.
  - `test_pull.py` additions: fetch after a failed pull, `no_store`, `no_remote`, error, timeout, `pull: false`, the result in `GET /api/projects/beads`, refresh waiting for fetches, the scheduled log.
- `vitest`: `match.test.ts` (sha match), `MarkdownView.test.tsx` (attachment image and link, pair served as attachment or file, unmatched `attachment:` as text), `ImagesPanel.test.tsx` (reason texts, `onError` caption), `Lightbox.test.tsx` (Open original of an attachment), the fetch note on the Beads and My Tasks pages.
- QA track: gin-qa cases for each new and modified REQ, api cases for the attachment route, and a manual case on real git: `gin attach add` on a bug in one clone, `gin attach push` and `bd dolt push`, then Refresh on a console reading another clone.

## Open Technical Questions
