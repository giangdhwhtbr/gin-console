# Plan: Shared bead attachments

Epic: gin-console-rm-shared-attachments
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Decision: `docs/adr/0006-console-fetches-attachments.md`. Diagrams: `docs/specs/beads/diagrams/shared-attachments-activity.md`, `docs/specs/beads/diagrams/attachment-image-state.md`, `docs/specs/beads/diagrams/attachments-fetch-state.md`. Use case: `docs/specs/beads/use-cases/see-shared-screenshots.md`.

## Objective

Everyone on the team sees a bead's screenshots, whoever took them:
- **Backend:** each bead's images include its attachments (`attachment:<sha256>` in the text, entries of `metadata.attachments`), an attachment with the `local:` line under it is one image, each attachment is checked against `refs/gin/attachments`, `refs/gin-console/attachments` or the `local` store, `GET /api/beads/{project}/{id}/attachments/{sha256}` serves a checked blob with immutable caching, and the pull pass fetches the shared store and keeps `attachments_fetch` per project.
- **Frontend:** attachment images inline, in the Images panel and in the lightbox; tiles of missing attachments say why; a tile whose image fails to load shows its caption; a note when the fetch of the current project failed; the image tooltip names both sources.

Done when:
- Every scenario of the 5 added REQs (`REQ-BEADS-031` to `REQ-BEADS-035`) and the new or changed scenarios of the 8 modified REQs (`REQ-BEADS-002`, `REQ-BEADS-026` to `REQ-BEADS-030`, `REQ-UI-028`, `REQ-UI-132`) have a test naming the REQ-ID.
- `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, and `uv --directory backend run mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-rm-shared-attachments --against master` prints `ok`, `gin specs trace --change gin-console-rm-shared-attachments` reports no missing REQ, and `gin-qa cases check --change gin-console-rm-shared-attachments` prints `ok`.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- **Problem statement:**
  - `beads/images.py:97-109` (`_path`) drops every `attachment:` address, and `bead_refs` (`:172-177`) reads only the description and notes, never `metadata.attachments`; a gin-qa bug therefore shows only its `local:` paths, which exist on one machine.
  - The backend runs no git command; nothing reads `refs/gin/attachments`, and the pull pass (`beads/pull.py`) runs only `bd dolt pull`.
  - `MarkdownView.tsx:53-74` renders an `attachment:` image as alt text, and `match.ts` (`findImage`) matches by path only.
- **Success criteria:** the REQs above, with the tests and checks of the Objective.
- **Global constraints** (from the spec, ADR 0006 and the user decisions of 2026-11-27):
  - **Read-only toward gin's store:** the server starts git only as `git fetch --quiet --no-write-fetch-head origin +refs/gin/attachments:refs/gin-console/attachments`, `git ls-tree -r --name-only <ref>` and `git cat-file` (`-s` or `blob`) on `<ref>:<aa>/<sha256>`, with `<ref>` one of `refs/gin/attachments` and `refs/gin-console/attachments`, each in a configured project's directory. It never creates, moves or deletes another ref, never writes `refs/gin/attachments` or `refs/gin/attachments-origin`, never pushes, never runs `gin attach`.
  - **Pairs:** an `attachment:` Markdown image and a `local:` line right under it are one image, served from the attachment when it is available, else from the file.
  - **Stores:** `git-ref` (also when `store` is missing) and `local` (`.agent-workflow/attachments/<aa>/<sha256>` under the project's `path`, inside it once resolved); any other store (`s3`) is `unsupported_store`.
  - **Trust:** the entry's `path`, `mime` and `bytes` are never used; the blob path comes from the `sha256`; a served blob must be at most 10 MB, have that SHA-256 and the first bytes of PNG, JPEG, GIF or WebP.
  - **Reasons:** `not_listed`, `pruned`, `unsupported_store`, `not_fetched`, in that order of checks.
  - **Listing:** `git ls-tree` at most once per ref per export snapshot, and only for a project with a `git-ref` entry; a project without one starts no git process on reading.
  - **Fetch:** after the project's `bd dolt pull`, whatever its result; same projects (`pull: false` and missing directories left out), four projects at a time, one pull of a project at a time, 30 seconds; statuses `ok`, `no_store` ("couldn't find remote ref"), `no_remote` ("does not appear to be a git repository"), `error` (last non-empty output line, "git fetch timed out", "git not found"); refresh and the scheduled pull wait for it; a failed scheduled fetch is logged.
  - **Serving:** `Cache-Control: private, max-age=31536000, immutable` for attachments, the other three image headers as REQ-BEADS-028, one 404 body for every failure; the browser never sends a path; `/images/{n}` serves only the file of image `n`.
  - **Tests:** no test starts git (`FakeGit`), bd or gin.
  - **Platforms:** Linux, macOS and native Windows keep working; `git` is spawned directly (`git.exe` on Windows needs no shim).
- **Non-goals:** uploading, captioning or pruning attachments; the `s3` store; showing `case`, `step`, `added_by` or `added_at`; attachments in comments.

## Approach Options
### Option 1: Console-owned ref in the project's clone, attachments as a second kind of bead image
- **Summary:** `beads/attachments.py` owns the store (listing, reading, checking); `beads/images.py` makes an image a file, an attachment or both and keeps one `ImageIndex`; `beads/pull.py` fetches after each pull; the frontend picks the address by `served_as`.
- **Pros:** the smallest exception to read-only (ADR 0006); reuses the image index, the panel, the lightbox and the pull pass; tracks split cleanly between backend store, backend fetch and frontend.
- **Cons:** git objects and one ref of the console's land in each project's `.git`.

### Option 2: Bare cache repository per project, or `gin attach fetch`
- **Summary:** fetch into `~/.cache/gin-console/attachments/<project>.git`, or let gin merge into `refs/gin/attachments`.
- **Pros:** the first never writes to the project; the second is gin's own path.
- **Cons:** rejected at discuss: the first needs a writable folder, a Docker volume, the remote URL and its credentials, and stores blobs twice; the second makes the console a writer of gin's store.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the design confirmed at discuss and recorded in ADR 0006.

## Scope
- **In scope:** `REQ-BEADS-031` to `REQ-BEADS-035`; modified `REQ-BEADS-002`, `REQ-BEADS-026`, `REQ-BEADS-027`, `REQ-BEADS-028`, `REQ-BEADS-029`, `REQ-BEADS-030`, `REQ-UI-028`, `REQ-UI-132`; the README section and the AGENTS.md read-only line; the gin-qa cases and specs of these REQs.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend store and images), Track 3 (frontend images) and Track 4 (frontend fetch note) share no file and run at once in their own worktrees; Track 2 (backend fetch) builds on the GitRunner, FakeGit and create_app parameter of Track 1 and waits for it; Track 5 (QA) waits for all four.
```

## Tasks

### Track 1: Attachments as bead images, read and served from the store
- **Dependencies**: none
- **Requirements**: REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-028, REQ-BEADS-031, REQ-BEADS-032, REQ-BEADS-035
- **Files**:
  - Create `backend/src/gin_console/beads/attachments.py`
  - Modify `backend/src/gin_console/beads/images.py:52-75` (`ImageRef`, `FoundImage` gain `sha256`, `served_as`, `reason`; `path` optional)
  - Modify `backend/src/gin_console/beads/images.py:97-177` (`_path` returns the sha of an `attachment:` address through a new `_attachment`; `_mentions`, `image_refs` and `bead_refs` yield attachments, merge a `local:` line under one, and append unnamed entries)
  - Modify `backend/src/gin_console/beads/images.py:285-347` (`_find`, `ImageIndex.of` and `ImageIndex.read` take an `AttachmentStore`; a new `ImageIndex.read_attachment`)
  - Modify `backend/src/gin_console/beads/models.py:122-131` (`BeadImage`)
  - Modify `backend/src/gin_console/beads/source.py:305-312` (the new fields of each image)
  - Modify `backend/src/gin_console/beads/router.py:28-38` (`ATTACHMENT_HEADERS`, `_SHA256`)
  - Modify `backend/src/gin_console/beads/router.py:58-70` (`build_router` takes `run_git`; `ImageIndex(Path.home(), AttachmentStore(run_git))`)
  - Modify `backend/src/gin_console/beads/router.py:132-151` (the attachment route after the image route)
  - Modify `backend/src/gin_console/app.py:74-84` and `:164-166` (`run_git: GitRunner = run_git` passed to the beads router)
  - Create `backend/tests/fake_git.py`
  - Test `backend/tests/test_bead_images.py` (attachment references, pairs, entries, captions, limit)
  - Test `backend/tests/test_bead_attachments.py`
  - Test `backend/tests/test_bead_attachments_api.py`
  - Test `backend/tests/test_bead_images_api.py` (`/images/{n}` of an attachment without a file; the new fields of `images`)
- **Interfaces**:
  - Consumes: `ProjectEntry` (`config.py`), `Snapshot` (`beads/snapshot.py`), `_child_env` (`projects/collect.py:33`), `media_type`, `MAX_BYTES`, `MAX_IMAGES`, `_load`, `_real_folders`, `locate` (`beads/images.py`), `valid_id` (`beads/source.py`), `IMAGE_NOT_FOUND`, `IMAGE_HEADERS`, `project_entry` (`beads/router.py`), `bead`, `write_export` (`tests/fake_export.py`), the `create_app` pattern of `tests/test_bead_images_api.py`.
  - Produces (`beads/attachments.py`):
    ```python
    REFS = ("refs/gin/attachments", "refs/gin-console/attachments")  # read in this order
    GIT_TIMEOUT_SECONDS = 30.0
    SHA256 = re.compile(r"[0-9a-f]{64}")
    Reason = Literal["not_listed", "pruned", "unsupported_store", "not_fetched"]

    class GitRun(NamedTuple):
        returncode: int
        stdout: bytes
        stderr: str

    class GitError(Exception):
        """git is missing, timed out or could not start."""

    class GitRunner(Protocol):
        def __call__(self, args: Sequence[str], cwd: Path) -> GitRun: ...

    def run_git(args: Sequence[str], cwd: Path) -> GitRun:
        """`git <args>` in cwd with `_child_env()`, stdout as bytes, 30 s; GitError("git not found"),
        GitError("git timed out") or GitError("git failed: <strerror>")."""

    def blob_path(sha256: str) -> str: ...  # f"{sha256[:2]}/{sha256}"

    @dataclass(frozen=True)
    class Entry:
        sha256: str
        store: str  # "git-ref" when missing
        pruned: bool
        caption: str | None
        name: str | None

    def entries(raw: Mapping[str, Any]) -> list[Entry]:
        """The valid entries of `metadata.attachments`, sha lower-cased, first of a sha kept."""

    class AttachmentStore:
        def __init__(self, run: GitRunner) -> None: ...
        def listing(self, entry: ProjectEntry, snapshot: Snapshot) -> frozenset[str]:
            """Blob paths of both refs, `git ls-tree -r --name-only <ref>` once per ref per snapshot
            object; frozenset() without running git when no bead of the snapshot has a git-ref entry;
            a ref that fails (missing, or GitError, logged once) counts as empty."""
        def state(self, entry: ProjectEntry, listed: frozenset[str], found: Entry | None) -> Reason | None:
            """None when available (REQ-BEADS-031), else the reason."""
        def read(self, entry: ProjectEntry, found: Entry) -> bytes | None:
            """git-ref: `cat-file -s` then `cat-file blob` on the first ref listing it, refused over
            MAX_BYTES before reading; local: `_load` inside entry.path; then `served`."""

    def served(data: bytes, sha256: str) -> str | None:
        """The media type when len(data) <= MAX_BYTES, sha256(data) == sha256 and media_type(data[:12]); else None."""
    ```
  - Produces (`beads/images.py`):
    - `ImageRef(path: str | None, caption: str, sha256: str | None = None)`; `FoundImage(n: int, path: str | None, caption: str, file: Path | None, available: bool, sha256: str | None = None, served_as: Literal["attachment", "file"] | None = None, reason: Reason | None = None)`.
    - `bead_refs(description: str | None, notes: str | None, metadata: Any = None) -> list[ImageRef]`: text first (attachments and files in order of first appearance, a `local:` path on the line under an `attachment:` image merged into it, a sha or path met again kept once), then the `entries` of `metadata` not named, at most `MAX_IMAGES`; captions per REQ-BEADS-026 (alt or link text, alt above a `local:` line, entry `caption`, entry `name`, file name, `sha256[:12]`).
    - `ImageIndex(home: Path, store: AttachmentStore)`; `of(entry, snapshot)` as today, with each image's `available`, `served_as` and `reason` per REQ-BEADS-027 and REQ-BEADS-031; `read(entry, snapshot, bead_id, n)` serves only the file of image `n`; `read_attachment(entry, snapshot, bead_id, sha256) -> tuple[bytes, str] | None` checks that `sha256` is an image of the bead and available, then `store.read`.
  - Produces (`beads/models.py`):
    ```python
    class BeadImage(BaseModel):
        model_config = ConfigDict(strict=True)
        n: int
        path: Text | None
        sha256: Text | None = None
        caption: Text
        available: bool
        served_as: Literal["attachment", "file"] | None = None
        reason: Literal["not_listed", "pruned", "unsupported_store", "not_fetched"] | None = None
    ```
  - Produces (`beads/router.py`): `ATTACHMENT_HEADERS = {**IMAGE_HEADERS, "Cache-Control": "private, max-age=31536000, immutable"}`; `GET /beads/{project}/{bead_id}/attachments/{sha256}` returning `Response(content, media_type=media, headers=ATTACHMENT_HEADERS)`, or `Response(status_code=404, content=IMAGE_NOT_FOUND, media_type="application/json")` when `sha256` does not match `[0-9a-f]{64}`, the bead id is not valid, the project is hidden or missing, the snapshot cannot be read, or `read_attachment` returns `None`.
  - Produces (`tests/fake_git.py`): `FakeGit(answers: dict[tuple[Path, tuple[str, ...]], GitRun | Exception] | None = None, delay: float = 0.0)` with `calls: list[tuple[Path, tuple[str, ...]]]`, `peak` and `running` as `FakeBd`; an unknown call answers `GitRun(128, b"", "fatal: unknown")`; helpers `listing(cwd, ref, paths)` and `blob(cwd, ref, sha, data)` that add the `ls-tree`, `cat-file -s` and `cat-file blob` answers.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** security-sensitive serving (hash, type, size, symlinks of the `local` store), a new subprocess runner on three platforms, and a text parser change that merges pairs and entries across images, source, router and app: the rubric's cross-module and security row.
- **Steps**:
  1. `fake_git.py`, then `test_bead_attachments.py` naming REQ-BEADS-031, REQ-BEADS-032 and REQ-BEADS-035: each scenario of REQ-BEADS-031 (shared ref, local ref, the four reasons, the local store with a symlink out using `Path.symlink_to` and `pytest.mark.skipif(sys.platform == "win32", ...)`, no git for a project without git-ref entries, one `ls-tree` per ref per snapshot object); `served` with a PNG `b"\x89PNG\r\n\x1a\n" + b"0" * 100` and its `hashlib.sha256` hex, a hash mismatch, text bytes, 11 MB (refused from `cat-file -s` without a `cat-file blob` call); `entries` with metadata `"none"`, `["oops", {"sha256": "x"}, {"sha256": <A upper case>}]`; REQ-BEADS-035 over every call `FakeGit` recorded. Run `uv --directory backend run pytest tests/test_bead_attachments.py`; expect import errors.
  2. Write `attachments.py` until the tests pass.
  3. `test_bead_images.py`: the changed and new scenarios of REQ-BEADS-026 (gin-qa evidence as one image with `sha256` and `path`, entries the text does not name, bad attachment addresses, attachment named twice in two letter cases, the 50 limit counting attachments) and REQ-BEADS-027 (attachment first, file as fallback); existing tests stay green except the old gin-qa evidence test, which changes with its scenario. Change `images.py` until they pass.
  4. `test_bead_attachments_api.py` and `test_bead_images_api.py`: every scenario of REQ-BEADS-032 and REQ-BEADS-002 "Attachment images", REQ-BEADS-028 "Attachment without a file", through `create_app(..., run_git=fake)` with export rows from `write_export` carrying `metadata.attachments`; assert the four attachment headers and the one 404 body for each case of "Not served" and "Bytes refused". Wire `models.py`, `source.py`, `router.py` and `app.py`.
  5. Run `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, `uv --directory backend run mypy`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-031, REQ-BEADS-032 and REQ-BEADS-035 (read side), and the new or changed scenarios of REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027 and REQ-BEADS-028 have a test naming the REQ-ID.
  - Existing bead and image tests pass, except the gin-qa evidence test rewritten for its new scenario.
  - No test starts git; `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: high

### Track 2: Fetch the shared store in the pull pass
- **Dependencies**: Track 1
- **Requirements**: REQ-BEADS-033, REQ-BEADS-035
- **Files**:
  - Modify `backend/src/gin_console/beads/pull.py:1-30` (docstring names ADR 0006; `FETCH_ARGS`)
  - Modify `backend/src/gin_console/beads/pull.py:42-110` (`PullService` takes `run_git`, fetches after each pull, keeps `fetch_result`)
  - Modify `backend/src/gin_console/beads/pull.py:122-127` (`PullScheduler.run_once` logs failed fetches)
  - Modify `backend/src/gin_console/projects/models.py:41-54` (`FetchResult`, `ProjectBeads.attachments_fetch`)
  - Modify `backend/src/gin_console/projects/source.py:55-65` (`build_project_beads` takes the fetch result)
  - Modify `backend/src/gin_console/projects/router.py:19-24` (passes `pulls.fetch_result(entry.name)`)
  - Modify `backend/src/gin_console/app.py:90` (`PullService(settings.projects, run_bd, clock, run_git)`)
  - Modify `AGENTS.md:29` (the read-only line names the attachment fetch and ADR 0006)
  - Modify `README.md:380-429` (a paragraph in "Pulling Beads" on the fetch and its note; a paragraph in "Bug screenshots" on shared attachments, the `local` store, `s3` not read, and the console's own ref)
  - Test `backend/tests/test_pull.py`
  - Test `backend/tests/test_project_beads.py` (`attachments_fetch` in `GET /api/projects/beads`)
- **Interfaces**:
  - Consumes: `GitRunner`, `GitRun`, `GitError` (`beads/attachments.py`), `FakeGit` (`tests/fake_git.py`), `FakeBd`, `PullResult`, `PullService`, `PullScheduler`.
  - Produces (`beads/pull.py`):
    ```python
    FETCH_ARGS = ("fetch", "--quiet", "--no-write-fetch-head", "origin",
                  "+refs/gin/attachments:refs/gin-console/attachments")

    class PullService:
        def __init__(self, projects: Sequence[ProjectEntry], run_bd: BdRunner,
                     clock: Callable[[], datetime], run_git: GitRunner | None = None) -> None: ...
        def pull_all(self) -> dict[str, PullResult]: ...  # unchanged; each job pulls, then fetches when run_git is set
        def fetch_result(self, name: str) -> FetchResult | None: ...
        def fetch_results(self, names: Collection[str]) -> dict[str, FetchResult]: ...
    ```
    `_pull` runs the fetch in the same worker after `_outcome`, so the four-worker pool and the one-job-per-project rule hold for both, and stores the fetch result before the future resolves. The outcome: exit 0 → `ok`; `"couldn't find remote ref"` in stderr → `no_store`; `"does not appear to be a git repository"` → `no_remote`; else `error` with the last non-empty stderr line (or `git fetch exited <n>`); `GitError` ending in "timed out" → "git fetch timed out", "git not found" kept; any other exception logged and `error` "git fetch failed".
    `PullScheduler.run_once` logs `"attachment fetch of %s failed: %s"` for each `error` of `fetch_results` of the pulled names.
  - Produces (`projects/models.py`):
    ```python
    class FetchResult(BaseModel):
        """The last fetch of the shared attachment store of a project (REQ-BEADS-033)."""
        at: datetime
        status: Literal["ok", "no_store", "no_remote", "error"]
        error: str | None = None

    # ProjectBeads gains:  attachments_fetch: FetchResult | None = None
    ```
  - Produces (`projects/source.py`): `build_project_beads(entry, snapshots, pull, fetch: FetchResult | None = None)`.
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded extension of an existing worker pool with each status and message written in the spec; the concurrency rules already exist and are kept by running the fetch inside the same job.
- **Steps**:
  1. `test_pull.py` naming REQ-BEADS-033 and REQ-BEADS-035: each scenario (fetch after a failed pull and its order in a shared call log, `no_store`, `no_remote`, error line, timeout, `pull: false` and missing directory, refresh waiting through `POST /api/refresh` with `create_app(..., run_bd=..., run_git=...)`, the scheduled log through `caplog`), four jobs at a time with both fakes delayed, the exact `FETCH_ARGS`. `test_project_beads.py`: `attachments_fetch` present after a pull, `null` before and for `pull: false`. Run them; expect failures.
  2. Change `pull.py`, `projects/models.py`, `projects/source.py`, `projects/router.py` and `app.py` until they pass.
  3. Update `AGENTS.md:29` to: "Read-only: never mutate projects or Beads; show a command or deep link instead. The exceptions are `bd dolt pull` in a configured project on refresh and on schedule (`beads/pull.py`, `docs/adr/0003-console-pulls-beads.md`), and the fetch of the shared attachment store into `refs/gin-console/attachments` right after it (`docs/adr/0006-console-fetches-attachments.md`)." Write the two README paragraphs.
  4. Run `uv --directory backend run pytest`, `ruff check .`, `mypy`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-033 and the fetch side of REQ-BEADS-035 have a test naming the REQ-ID; the REQ-BEADS-016 and REQ-BEADS-017 tests pass unchanged.
  - `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: medium

### Track 3: Attachment images on the bead page
- **Dependencies**: none
- **Requirements**: REQ-BEADS-029, REQ-BEADS-030, REQ-UI-028, REQ-UI-132
- **Files**:
  - Modify `frontend/src/features/beads/api.ts:19-20` (`BeadImage`)
  - Modify `frontend/src/features/beads/api.ts:85-88` (`attachmentUrl`, `imageAddress`)
  - Modify `frontend/src/features/beads/api.ts:189-205` (`isBeadImage` accepts the new fields when present and a `null` path)
  - Modify `frontend/src/features/beads/images/match.ts:1-35` (`attachmentSha`, `findImage` matches an `attachment:` address by `sha256` first)
  - Modify `frontend/src/features/beads/BeadBody.tsx:17-43` (the resolver's `url(n)` returns `imageAddress`; panel and lightbox get the addresses)
  - Modify `frontend/src/features/beads/images/ImagesPanel.tsx:1-52` (address per image, reason texts, `onError` caption)
  - Modify `frontend/src/features/beads/images/Lightbox.tsx:1-99` (image and "Open original" from `imageAddress`)
  - Modify `frontend/src/lib/definitions.ts:15` (`images`)
  - Test `frontend/src/features/beads/images/match.test.ts`
  - Test `frontend/src/features/beads/MarkdownView.test.tsx`
  - Test `frontend/src/features/beads/images/ImagesPanel.test.tsx`
  - Test `frontend/src/features/beads/images/Lightbox.test.tsx`
  - Test `frontend/src/features/beads/CountBadge.test.tsx` (the tooltip sentence)
  - Test `frontend/src/features/beads/api.test.ts` (the guard and `imageAddress`)
- **Interfaces**:
  - Consumes: the API of Track 1 as written in this plan (`BeadImage` fields, `GET /api/beads/{project}/{id}/attachments/{sha256}`); `ImageResolver` of `MarkdownView.tsx` unchanged (`find(address)`, `url(n)`, `open(n, from)`).
  - Produces (`api.ts`):
    ```ts
    export type ImageReason = "not_listed" | "pruned" | "unsupported_store" | "not_fetched";
    export type BeadImage = {
      n: number; path: string | null; caption: string; available: boolean;
      sha256?: string | null; served_as?: "attachment" | "file" | null; reason?: ImageReason | null;
    };
    export const attachmentUrl = (project: string, id: string, sha256: string): string =>
      `/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}/attachments/${sha256}`;
    /** The address an available image loads from (REQ-BEADS-029); null when not available. */
    export function imageAddress(project: string, id: string, image: BeadImage): string | null;
    ```
    `imageAddress` gives `attachmentUrl` when `served_as` is `attachment` and `sha256` is set, `imageUrl(project, id, image.n)` when `served_as` is `file`, or when `served_as` is missing and `available` (an older backend), else `null`.
  - Produces (`images/match.ts`): `attachmentSha(address: string): string | null` (`/^attachment:([0-9a-f]{64})$/i`, lower-cased); `findImage(images, address)` returns the available image whose `sha256` equals `attachmentSha(address)` when that is not null, else the path match of today.
  - Produces (`ImagesPanel.tsx`): `ImagesPanel({ project, beadId, images, onOpen })` unchanged in props; an unavailable tile reads `REASON_TEXT[image.reason ?? "none"]` with `REASON_TEXT = { not_listed: "Not attached to this bead", pruned: "Pruned", unsupported_store: "Stored where this host cannot read it", not_fetched: "Not fetched yet", none: "Not on this host" }`, followed by `image.path` when it is not null; an available tile whose `<img>` fires `onError` shows the caption text in place of the image.
  - Produces (`Lightbox.tsx`): props unchanged; `src` and "Open original" `href` are `imageAddress(project, beadId, image)`.
  - Produces (`definitions.ts`): `images: "Images: screenshots of this bead the console can show, from files on the console host and attachments in the shared store."`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded changes to components written last epic, with every text, address rule and fallback given in the spec and this plan.
- **Steps**:
  1. `match.test.ts` and `MarkdownView.test.tsx` naming REQ-UI-028: the "Attachment image inline" scenario (one pair served as attachment, one served as file, the `local:` line as text), "Link to a bead image" with `[shot](attachment:A)`, an unmatched `attachment:` (64 hex digits not in `images`) as alt text, "External image not loaded" unchanged. Run `pnpm -C frontend test --run src/features/beads/MarkdownView.test.tsx src/features/beads/images`; expect failures.
  2. Change `api.ts`, `match.ts` and `BeadBody.tsx` until they pass.
  3. `ImagesPanel.test.tsx` (REQ-BEADS-029 "Attachments", "Image fails to load" with `fireEvent.error` on the `img`, "Two images, one missing" unchanged) and `Lightbox.test.tsx` (REQ-BEADS-030 "Open original of an attachment"); change the two components.
  4. `CountBadge.test.tsx`: REQ-UI-132 "Image indicator" reads the new sentence; change `definitions.ts`.
  5. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`; commit.
- **Acceptance criteria**:
  - The new and changed scenarios of REQ-BEADS-029, REQ-BEADS-030, REQ-UI-028 and REQ-UI-132 have tests naming the REQ-ID; the other image, Markdown and badge tests pass.
  - `vitest`, `typecheck`, and `lint` pass.
- **Estimated complexity**: medium

### Track 4: Fetch failure note on Beads and My Tasks
- **Dependencies**: none
- **Requirements**: REQ-BEADS-034
- **Files**:
  - Modify `frontend/src/features/projects/api.ts:32-41` (`FetchResult`, `ProjectBeads.attachments_fetch?`)
  - Modify `frontend/src/features/projects/api.ts:72-85` (`fetchOf`, beside `pullOf`)
  - Modify `frontend/src/features/beads/PullNote.tsx:1-20` (`PullFailure.kind`, the fetch sentence)
  - Modify `frontend/src/features/beads/BeadsPage.tsx:28-46` (failures from `fetchOf` too)
  - Modify `frontend/src/features/my-tasks/load.ts:15-28` (same)
  - Test `frontend/src/features/projects/api.test.ts` (`fetchOf`)
  - Create `frontend/src/features/beads/PullNote.test.tsx`
  - Test `frontend/src/features/beads/BeadsPage.test.tsx`
  - Test `frontend/src/features/my-tasks/MyTasksPage.test.tsx`
- **Interfaces**:
  - Consumes: `GET /api/projects/beads` with `attachments_fetch` as Track 2 produces it (`{at, status: "ok" | "no_store" | "no_remote" | "error", error}`), absent from an older backend.
  - Produces (`projects/api.ts`): `export type FetchResult = { at: string; status: "ok" | "no_store" | "no_remote" | "error"; error: string | null }`; `ProjectBeads.attachments_fetch?: FetchResult | null`; `export function fetchOf(project: { attachments_fetch?: unknown }): FetchResult | null` with the checks of `pullOf`.
  - Produces (`PullNote.tsx`): `export type PullFailure = { project: string; path: string; error: string; kind?: "pull" | "attachments" }`; a failure of kind `attachments` reads "Fetching attachments of {project} failed: {error}. Run <code>git fetch origin +refs/gin/attachments:refs/gin-console/attachments</code> in {path}."; kind `pull` or missing keeps today's sentence; the key is `${kind}:${project}`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** a copy of the existing pull note pattern with the sentence and the statuses written in the spec.
- **Steps**:
  1. Tests naming REQ-BEADS-034: `fetchOf` with a valid, a missing and a malformed value; `PullNote` with an `attachments` failure; the Beads page with A (`error`) and B (`no_store`) shows one fetch note for A only; My Tasks shows it for the current project; an older backend without the key shows none. Run them; expect failures.
  2. Change the five files until they pass.
  3. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-BEADS-034 has a test naming it; the REQ-BEADS-018 tests pass unchanged.
  - `vitest`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: low

### Track 5: QA cases and e2e specs for Shared bead attachments
- **Dependencies**: Track 1, Track 2, Track 3, Track 4
- **Requirements**: REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-028, REQ-BEADS-029, REQ-BEADS-030, REQ-BEADS-031, REQ-BEADS-032, REQ-BEADS-033, REQ-BEADS-034, REQ-BEADS-035, REQ-UI-028, REQ-UI-132
- **Files**:
  - Modify and add cases in `qa/cases/beads/` and `qa/cases/ui/`, as `gin-qa cases plan --change gin-console-rm-shared-attachments` lists them (new REQs without a case and the stale cases of the modified REQs)
  - Create `backend/tests/test_bead_attachments_cases_api.py` for the `api` cases (the gin-qa `api` glob is `backend/tests/test_*_api.py`)
  - Modify `qa/e2e/support/api.ts` or the beads stubs only where a stub for `/api/beads/<project>/<id>/attachments/<sha>` or the new image and fetch fields is missing
  - Create e2e specs under `qa/e2e/beads/` and modify the specs of stale cases
  - Modify `docs/changes/gin-console-rm-shared-attachments-shared-attachments/05-tests.md` (the manual case of real git)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in the existing gin-qa patterns, as the last epic's QA track.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-shared-attachments` prints `ok`, `gin-qa cases plan --change gin-console-rm-shared-attachments` lists nothing missing, stale or obsolete, and `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The new and changed e2e specs pass on the built UI, run with a Playwright config outside the repo on port 8702 (never stop a server on 8701): a gin-qa bug with an attachment served as attachment and one falling back to its file, the four reasons on tiles, a tile whose image answers 404, the fetch note on Beads and My Tasks, the lightbox's "Open original" of an attachment.
  - A manual case in `05-tests.md`: `gin attach add` on a bug in one clone of gin-console, `gin attach push` and `bd dolt push`, then Refresh on a console reading another clone shows the screenshot.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/shared-attachments`, checked out in `.planning/worktrees/shared-attachments`, fast-forwarded to `master` `aa0cb1e` before this plan.
- **Merge strategy**: parallel-then-merge: Tracks 1, 3 and 4 at once in worktrees from `feat/shared-attachments`; Track 2 after Track 1 merges into it; Track 5 after the four merge.
- **Overlap with gin-console-rm-test-coverage** (`feat/test-coverage`, planned at the same time): it also changes `backend/src/gin_console/beads/images.py` (public file checks) and `frontend/src/features/beads/images/Lightbox.tsx` (props of `{src, caption}`), and `app.py`. Whichever epic ships second merges `master` into its branch first and resolves those files by keeping both changes. This plan's `Lightbox` change is only the address of each image: when test-coverage has merged first, `Lightbox` takes `slides: {key, src, caption}[]`, and Track 3 instead sets each slide's `src` to `imageAddress(project, bead.id, image)` in `BeadBody.tsx` and leaves `Lightbox.tsx` as it is.
- **Shared checkout**: other sessions use the main checkout; this epic never switches it. Right before merging to `master` at ship, compare `origin/master` with the base of the branch.

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, and `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-rm-shared-attachments --against master` prints `ok` and `gin specs trace --change gin-console-rm-shared-attachments` reports no missing REQ
- [ ] `gin-qa cases check --change gin-console-rm-shared-attachments` prints `ok`
- [ ] Manual check on the built UI: after `gin attach add` of a PNG on a gin-console bug and Refresh, the bug shows it from `/api/beads/<project>/<id>/attachments/<sha>`; `git for-each-ref refs/gin` in the project lists `refs/gin-console/attachments` and an unchanged `refs/gin/attachments`; a project without attachments starts no git process on its Beads page.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- Deliverable merge-holds apply exclusively to the Parent Bead (`gin-console-rm-shared-attachments`). Individual track beads close after tests and review pass so dependents unblock.
