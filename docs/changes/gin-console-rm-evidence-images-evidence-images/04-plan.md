# Plan: Evidence images from local files

Epic: gin-console-rm-evidence-images
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Diagrams: `docs/specs/beads/diagrams/bead-images-activity.md`, `docs/specs/config/diagrams/evidence-folders-activity.md`. Use case: `docs/specs/beads/use-cases/see-bug-screenshots.md`.

## Objective

A developer or QA opens a bead and sees the screenshots it names, when the files are on the console host:
- **Backend:** each bead's images found in its description and notes, checked against the project folder and its `evidence_roots`, counted on list rows, listed on the detail, and served one at a time by `GET /api/beads/{project}/{id}/images/{n}`.
- **Frontend:** images inline in the description, an Images panel, a lightbox, an image indicator on cards and List rows; external images no longer load in any Markdown view.

Done when:
- Every scenario of the 6 added REQs (`REQ-CONFIG-008`, `REQ-BEADS-026` to `REQ-BEADS-030`) and the new scenarios of the 5 modified REQs (`REQ-BEADS-001`, `REQ-BEADS-002`, `REQ-UI-028`, `REQ-UI-066`, `REQ-UI-132`) have a test naming the REQ-ID.
- `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-rm-evidence-images --against master` prints `ok`, `gin specs trace --change gin-console-rm-evidence-images` reports no missing REQ, and `gin-qa cases check --change gin-console-rm-evidence-images` prints `ok`.

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
  - `MarkdownView` (`frontend/src/features/beads/MarkdownView.tsx:5-7`) blanks every address that is not `http`, `https` or `mailto`, so a local screenshot path shows nothing, while `![x](https://host/x.png)` loads from an outside host.
  - The bead models (`backend/src/gin_console/beads/models.py:49-131`) carry no images, and no route serves a file of a project except the mockup files of the requirements context.
  - `ProjectEntry` (`backend/src/gin_console/config.py:68-80`) knows only the project `path`, while 47 of the 48 qwikfone bug screenshots on this host live outside it.
- **Success criteria:** the REQs above, with the tests and checks of the Objective.
- **Global constraints** (from the spec and the user decisions of 2026-11-26):
  - **Read-only:** nothing is written to projects, Beads or the image folders.
  - **Folders:** the project `path` and the folders of `evidence_roots` (absolute, per project). A folder that does not exist serves nothing.
  - **Paths:** every path ending in `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` (any case) in the description, then the notes, of any bead: Markdown image addresses, Markdown link targets, `local:` lines, and paths standing alone between spaces, backticks or line ends; `file://` dropped and percent-decoded; other schemes dropped; `~/` from the home of the user running the console; relative paths from the project `path`; first appearance order, duplicates once, at most 50.
  - **Caption:** alt or link text that names it first; else, for a `local:` line, the alt of a Markdown image on the line right above; else the file name.
  - **Available:** no `..` part, no `\`, no NUL, no `:` other than a Windows drive of an absolute path (checked before touching the disk); the resolved file is a regular file inside the resolved project `path` or a resolved folder of `evidence_roots`; at most 10 MB; first bytes of PNG, JPEG, GIF or WebP (SVG never). A file that cannot be read is not available.
  - **Serving:** only `GET /api/beads/{project}/{id}/images/{n}`, re-checking availability; headers `Content-Type` from the first bytes, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline`, `Cache-Control: private, no-cache`; 404 with one body for every failure; the browser never sends a path.
  - **Counting:** `image_count` and `images` are worked out once per export snapshot (`SnapshotStore` returns the same `Snapshot` object until the export changes, REQ-BEADS-012).
  - **Markdown everywhere:** an `http`/`https` image never loads; it shows as the link "Image: <alt> (<host>)"; any other image that is not an available image of the bead shows as its alt text. Raw HTML stays text (REQ-UI-028).
  - **`attachment:<sha>`** addresses keep showing as text (gin-console-rm-shared-attachments).
  - **Platforms:** Linux, macOS and native Windows keep working; path checks use `pathlib`.
- **Non-goals:** the shared attachment store; uploading, editing or deleting images; images in comments, design or acceptance criteria; files on other machines.

## Approach Options
### Option 1: Backend finds and serves by bead; the frontend renders
- **Summary:** Track 1 adds `evidence_roots`, `beads/images.py` and the route; Track 2 renders images in the description, the Images panel and the lightbox against the API contract of this plan, in parallel with Track 1; Track 3 adds the image indicator; Track 4 writes the QA cases and specs.
- **Pros:** one module decides what an image is and whether it may be served; the browser never sends a path; the count only counts files this host has; Tracks 1 and 2 share no file.
- **Cons:** the backend stats the named files once per snapshot.

### Option 2: The browser finds paths, the backend serves a path
- **Summary:** the frontend parses the description and asks `GET /api/files?project=&path=`.
- **Pros:** less backend code.
- **Cons:** rejected at discuss: any image under the folders can be fetched by path, and a card cannot tell a missing file from a present one without a request per image.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the design confirmed at discuss; it narrows what can be fetched to the images a bead names, and keeps the path rules in one tested Python module.

## Scope
- **In scope:** `REQ-CONFIG-008`, `REQ-BEADS-026` to `REQ-BEADS-030`; modified `REQ-BEADS-001`, `REQ-BEADS-002`, `REQ-UI-028`, `REQ-UI-066`, `REQ-UI-132`; `config.example.yaml` and the README config section; the gin-qa cases and specs of these REQs.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend config, beads images, router, backend tests, config.example.yaml and README) and Track 2 (frontend beads Markdown, Images panel, lightbox, api types) share no file, so they run at once in their own worktrees; Track 3 edits the bead types Track 2 adds and waits for it; Track 4 waits for Tracks 1 and 3.
```

## Tasks

### Track 1: Find, check and serve bead images
- **Dependencies**: none
- **Requirements**: REQ-CONFIG-008, REQ-BEADS-001, REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-028
- **Files**:
  - Modify `backend/src/gin_console/config.py:68-80` (`ProjectEntry.evidence_roots`)
  - Create `backend/src/gin_console/beads/images.py`
  - Modify `backend/src/gin_console/beads/models.py:49-131` (`BeadSummary.image_count`, `BeadImage`, `BeadDetail.images`)
  - Modify `backend/src/gin_console/beads/source.py:149-197` and `:274-303` (`list_beads` and `get_bead` take the images of the snapshot)
  - Modify `backend/src/gin_console/beads/router.py:46-135` (project entry lookup, one image index per project, the image route)
  - Modify `config.example.yaml:13-20` (an `evidence_roots` example on one project, commented)
  - Modify `README.md:328-358` (a short section "Bug screenshots" after "Pulling Beads", on `evidence_roots`)
  - Test `backend/tests/test_bead_images.py`
  - Test `backend/tests/test_bead_images_api.py`
  - Test `backend/tests/test_config.py` (`evidence_roots`)
  - Test `backend/tests/test_beads_api.py` (`image_count`, `images`)
- **Interfaces**:
  - Consumes: `ProjectEntry`, `Settings` (`config.py`), `Snapshot`, `SnapshotStore` (`beads/snapshot.py`), `list_beads`, `get_bead`, `BeadNotFound`, `valid_id` (`beads/source.py`), the path guards of `requirements/files.py:33-65` as the pattern (`_REFUSED = (OSError, ValueError, RuntimeError)`, reject parts before touching the disk), the plain `Response` with headers of `requirements/router.py:99-109`. Test helpers: `tests/fake_export.py` (`bead`, `write_export`), `tests/fake_bd.py`, the `make` pattern of `tests/test_beads_api.py`.
  - Produces (`config.py`): `ProjectEntry.evidence_roots: list[Path] = []` with a validator that refuses a path that is neither POSIX- nor Windows-absolute, as `_absolute` does for `path`.
  - Produces (`beads/models.py`):
    ```python
    class BeadImage(BaseModel):
        model_config = ConfigDict(strict=True)
        n: int
        path: Text
        caption: Text
        available: bool

    # BeadSummary gains:   image_count: int = 0
    # BeadDetail gains:    images: list[BeadImage] = []
    ```
  - Produces (`beads/images.py`):
    - `MAX_IMAGES = 50`, `MAX_BYTES = 10 * 1024 * 1024`.
    - `@dataclass(frozen=True) class ImageRef: path: str; caption: str` (path as written without `file://`, percent-decoded).
    - `image_refs(text: str) -> list[ImageRef]`: the refs of one text in first-appearance order, with the caption rules.
    - `bead_refs(description: str | None, notes: str | None) -> list[ImageRef]`: description then notes, duplicates by `path` once (the first caption kept), at most `MAX_IMAGES`.
    - `media_type(head: bytes) -> str | None`: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, else `None`.
    - `locate(written: str, project: Path, home: Path) -> Path | None`: the text rules, then the absolute path (no disk access); `None` when refused.
    - `check(file: Path, folders: Sequence[Path]) -> str | None`: resolve, inside one resolved folder, regular file, size at most `MAX_BYTES`, `media_type` of the first 12 bytes; returns the media type, or `None`; catches `_REFUSED`.
    - `@dataclass(frozen=True) class FoundImage: n: int; path: str; caption: str; file: Path | None; available: bool`.
    - `find_images(raw: Mapping[str, Any], entry: ProjectEntry, home: Path) -> list[FoundImage]`.
    - `class ImageIndex`: `__init__(self, home: Path)`; `of(self, entry: ProjectEntry, snapshot: Snapshot) -> Mapping[str, list[FoundImage]]` keyed by bead id, recomputed only when `snapshot` is not the object it was computed for (kept per `entry.name`); `read(self, entry, snapshot, bead_id: str, n: int) -> tuple[bytes, str] | None` (re-runs `check`, reads the bytes).
  - Produces (`beads/source.py`): `list_beads(snapshot: Snapshot, closed: bool, images: Mapping[str, Sequence[FoundImage]] | None = None)` sets `image_count` to the available images of each bead; `get_bead(snapshot: Snapshot, bead_id: str, images: Mapping[str, Sequence[FoundImage]] | None = None)` sets `images` as `BeadImage` rows. Callers that pass nothing keep today's output with `image_count` 0 and `images` `[]`.
  - Produces (`beads/router.py`): `project_entry(name: str | None) -> ProjectEntry` (404 as `project_dir` does; `project_dir` returns `project_entry(name).path`); `index = ImageIndex(Path.home())`; `GET /beads/{project}/{bead_id}/images/{n}` with `n: int`, answering `Response(content=..., media_type=..., headers={"X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'", "Content-Disposition": "inline", "Cache-Control": "private, no-cache"})`, or `Response(status_code=404, content=b'{"error":"not found"}', media_type="application/json")` for every failure.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** security-sensitive path handling (traversal, symlinks, Windows forms, two kinds of folders) plus a four-form text parser and a per-snapshot cache across config, source and router: the rubric's cross-module and security row.
- **Steps**:
  1. `test_bead_images.py` first, one test per scenario of REQ-BEADS-026 and REQ-BEADS-027 naming its REQ-ID, using `tmp_path` folders, real symlinks (`Path.symlink_to`; skip the symlink tests on Windows with `pytest.mark.skipif(sys.platform == "win32", ...)`), PNG bytes `b"\x89PNG\r\n\x1a\n" + b"0" * 100`, JPEG `b"\xff\xd8\xff"`, GIF `b"GIF89a"`, WebP `b"RIFF....WEBP"`, an SVG text, an 11 MB file (`f.truncate(11 * 1024 * 1024)` after the PNG header), and `home` passed in. Add: `%20` in a `file://` URL, `C:\shots\a.png` refused, a `:` in the middle refused, the caption from the line above a `local:` line, `ImageIndex` reusing its result for the same snapshot object and recomputing for a new one. Run `uv --directory backend run pytest tests/test_bead_images.py`; expect import errors.
  2. Write `images.py` and the models until the tests pass.
  3. `test_config.py`: `evidence_roots` absolute accepted, missing gives `[]`, `[shots]` exits with a message naming `evidence_roots` (REQ-CONFIG-008, through the existing load helper used by `test_config_003_*`). Add the field.
  4. `test_beads_api.py` and `test_bead_images_api.py`: the new scenarios of REQ-BEADS-001 and REQ-BEADS-002 and every scenario of REQ-BEADS-028 through the app (export rows written with `write_export` in `tmp_path/<project>`, image files beside them, a second project with `evidence_roots`); the four headers; one 404 body for unknown project, bead, `n` 0, `n` past the end, an unavailable image, and a file deleted after a first request. Wire `source.py` and `router.py`.
  5. Update `config.example.yaml` and the README paragraph: what `evidence_roots` is for, that a missing folder serves nothing, that only images a bead names are served.
  6. Run `uv --directory backend run pytest`, `ruff check .`, `mypy`; commit.
- **Acceptance criteria**:
  - Every scenario of REQ-CONFIG-008, REQ-BEADS-026, REQ-BEADS-027 and REQ-BEADS-028, and the new scenarios of REQ-BEADS-001 and REQ-BEADS-002, have a test naming the REQ-ID.
  - Existing beads and config tests pass unchanged.
  - `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: high

### Track 2: Images on the bead page
- **Dependencies**: none
- **Requirements**: REQ-UI-028, REQ-BEADS-029, REQ-BEADS-030
- **Files**:
  - Modify `frontend/src/features/beads/api.ts:19-80` (`BeadImage`, `BeadSummary.image_count?`, `BeadDetail.images?`, `imageUrl`)
  - Create `frontend/src/features/beads/images/match.ts`
  - Modify `frontend/src/features/beads/MarkdownView.tsx:1-31` (an `img` component, the `a` rule, an optional resolver)
  - Modify `frontend/src/features/beads/MarkdownText.tsx:1-13` (passes the resolver through)
  - Create `frontend/src/features/beads/images/ImagesPanel.tsx`
  - Create `frontend/src/features/beads/images/Lightbox.tsx`
  - Modify `frontend/src/features/beads/BeadBody.tsx:9-40` (panel under the description, lightbox state, resolver for the description)
  - Test `frontend/src/features/beads/images/match.test.ts`
  - Test `frontend/src/features/beads/MarkdownView.test.tsx`
  - Test `frontend/src/features/beads/images/ImagesPanel.test.tsx`
  - Test `frontend/src/features/beads/images/Lightbox.test.tsx`
  - Test `frontend/src/features/beads/BeadDetailPage.test.tsx` (the panel on the page)
- **Interfaces**:
  - Consumes: `Dialog` from `@base-ui/react/dialog` as in `features/jump/JumpPalette.tsx:1-111` (`Dialog.Root open onOpenChange`, `Dialog.Portal`, `Dialog.Backdrop`, `Dialog.Popup`, `Dialog.Title`), `Button` (`components/ui/button`), lucide icons, `BeadBody` callers (`BeadDetailPage.tsx`, `EpicPage.tsx`; the details panel renders `BeadDetailPage`).
  - Produces (`api.ts`): `export type BeadImage = { n: number; path: string; caption: string; available: boolean }`; `BeadSummary.image_count?: number`; `BeadDetail.images?: BeadImage[]`; `export const imageUrl = (project: string, id: string, n: number): string => \`/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}/images/${n}\``. The guards accept a missing `image_count` and `images`, and refuse wrong types when present.
  - Produces (`images/match.ts`): `imagePath(address: string): string` (drops a leading `file://`, percent-decodes with a fallback to the input); `findImage(images: readonly BeadImage[], address: string): BeadImage | null` (an available image whose `path` equals `imagePath(address)`).
  - Produces (`MarkdownView.tsx`): `export type ImageResolver = { find(address: string): BeadImage | null; url(n: number): string; open(n: number, from: HTMLElement): void }`; `MarkdownView({ text, images }: { text: string; images?: ImageResolver })`. `urlTransform` keeps every address so the components can decide; `a` renders an external `http(s)`/`mailto` link as today, a link whose target `images.find` resolves as a button that calls `open`, and anything else as text; `img` renders an available bead image as a button holding `<img src={url(n)} alt=... loading="lazy" className="max-h-96 max-w-full">`, an `http(s)` image as `<a href target="_blank" rel="noreferrer">Image: {alt} ({host})</a>`, and anything else as its alt text in a `<span>`. `safeUrl` stays exported for links.
  - Produces (`MarkdownText.tsx`): `MarkdownText({ text, images }: { text: string; images?: ImageResolver })`.
  - Produces (`images/ImagesPanel.tsx`): `ImagesPanel({ project, beadId, images, onOpen }: { project: string; beadId: string; images: readonly BeadImage[]; onOpen(n: number, from: HTMLElement): void })`, nothing when `images` is empty; section `aria-labelledby` with the heading "Images (<count>)"; tiles in a wrapping grid; an available tile is a button with its number, the image and its caption; an unavailable tile reads "Not on this host" and the path.
  - Produces (`images/Lightbox.tsx`): `Lightbox({ project, beadId, images, current, onChange, onClose }: { project: string; beadId: string; images: readonly BeadImage[]; current: number | null; onChange(n: number): void; onClose(): void })`; the dialog title is the caption, "<k> of <m>" over the available images, ← and → move without wrapping, Escape and the close button call `onClose`, "Open original" links to `imageUrl` with `target="_blank"` and `rel="noreferrer"`.
  - Produces (`BeadBody.tsx`): holds `current: number | null` and the element that opened it; builds the resolver from `bead.images ?? []`; passes it to the description only; renders `ImagesPanel` right after the description and the `Lightbox`; on close, focuses the opener again.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded components in existing patterns (MarkdownView components, base-ui Dialog of the jump palette) with every text and key written in the spec.
- **Steps**:
  1. `match.test.ts` and `MarkdownView.test.tsx` first: the three new scenarios of REQ-UI-028 naming it (bead image inline and opening the lightbox through the resolver; external image as a link with no `img` element and no request; link to a bead image as a button), the existing REQ-UI-028 tests unchanged, a caller without a resolver (`attachment:` and relative images as alt text). Run `pnpm -C frontend test --run src/features/beads/MarkdownView.test.tsx src/features/beads/images`; expect failures.
  2. Write `match.ts`, the `api.ts` types and guard, `MarkdownView.tsx` and `MarkdownText.tsx` until they pass.
  3. `ImagesPanel.test.tsx` and `Lightbox.test.tsx`: every scenario of REQ-BEADS-029 and REQ-BEADS-030 naming them, plus Enter on a tile, the close button, and the phone width class (`grid` with wrapping columns, no fixed widths over 390px). Write the components.
  4. `BeadDetailPage.test.tsx`: a bead with images shows the panel under the description and the lightbox returns the focus to the tile; a bead without images has no panel. Wire `BeadBody.tsx`.
  5. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`; commit.
- **Acceptance criteria**:
  - The new scenarios of REQ-UI-028 and every scenario of REQ-BEADS-029 and REQ-BEADS-030 have tests naming the REQ-ID; the existing MarkdownView, MockupsSection, ChangePage and RetroTab tests pass.
  - `vitest`, `typecheck`, and `lint` pass.
- **Estimated complexity**: medium

### Track 3: Image indicator on cards and rows
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-066, REQ-UI-132
- **Files**:
  - Modify `frontend/src/features/beads/CountBadge.tsx:6-9` (kind `images`, icon `Image` from lucide-react, nouns "image"/"images")
  - Modify `frontend/src/lib/definitions.ts` (the key `images`)
  - Modify `frontend/src/features/beads/BeadCard.tsx:89-90` (the indicator after dependencies)
  - Modify `frontend/src/features/beads/ListRow.tsx:118-119` (same)
  - Modify `frontend/src/components/Legend.tsx:59-60` (an entry for the indicator)
  - Test `frontend/src/features/beads/CountBadge.test.tsx`
  - Test `frontend/src/features/beads/BeadCard.test.tsx`
  - Test `frontend/src/components/Legend.test.tsx` (only if it counts the entries)
- **Interfaces**:
  - Consumes: `BeadSummary.image_count?: number` from Track 2; `CountBadge`, `Hint`, `DEFINITIONS`.
  - Produces: `CountBadge` kind `images`; `DEFINITIONS.images = "Images: screenshots this bead names that exist on the console host."`; `<CountBadge kind="images" count={bead.image_count ?? 0} />` in `BeadCard` and `ListRow`.
- **Provider role**: `frontend`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** a mechanical addition of one kind to an existing component and two call sites, with the label and tooltip text written in the spec.
- **Steps**:
  1. `CountBadge.test.tsx`: `kind="images"` with 2 reads "2 images", with 1 reads "1 image", with 0 renders nothing, and its tooltip is `DEFINITIONS.images` (REQ-UI-066 "Images", REQ-UI-132 "Image indicator"); `BeadCard.test.tsx`: a bead with `image_count` 2 shows the indicator. Run `pnpm -C frontend test --run src/features/beads/CountBadge.test.tsx src/features/beads/BeadCard.test.tsx`; expect failures.
  2. Add the kind, the definition, the two call sites and the legend entry until they pass.
  3. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`; commit.
- **Acceptance criteria**:
  - The new scenarios of REQ-UI-066 and REQ-UI-132 have tests naming the REQ-ID.
  - `vitest`, `typecheck`, `lint`, and `build` pass.
- **Estimated complexity**: low

### Track 4: QA cases and e2e specs for Evidence images
- **Dependencies**: Track 1, Track 3
- **Requirements**: REQ-CONFIG-008, REQ-BEADS-001, REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-028, REQ-BEADS-029, REQ-BEADS-030, REQ-UI-028, REQ-UI-066, REQ-UI-132
- **Files**:
  - Modify and add cases in `qa/cases/beads/`, `qa/cases/ui/` and `qa/cases/config/`, as `gin-qa cases plan --change gin-console-rm-evidence-images` lists them (today: 7 REQs without a case and 23 stale cases of the modified REQs)
  - Create `backend/tests/test_bead_images_cases_api.py` for the `api` cases (the gin-qa `api` glob is `backend/tests/test_*_api.py`)
  - Modify `qa/e2e/support/api.ts` or the beads stubs only if a stub for `/api/beads/<project>/<id>/images/<n>` or the new fields is missing
  - Create e2e specs under `qa/e2e/beads/` and modify the specs of stale cases
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in the existing gin-qa patterns; e2e writing stays on the middle model, as the user asked for e2e and test agents.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-rm-evidence-images` prints `ok`, `gin-qa cases plan --change gin-console-rm-evidence-images` lists nothing missing, stale or obsolete, and `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The new and changed e2e specs pass on the built UI, run with a Playwright config outside the repo on port 8702 (port 8701 is held by an older server; never stop it): a bug with an available image and a missing one, the lightbox by keyboard, an external image shown as a link with no request to its host, the indicator on a card, and the bead page at 390px without horizontal page scroll.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/rm-evidence-images` (the spec branch; it is checked out in `.planning/worktrees/gin-console-rm-evidence-images`)
- **Merge strategy**: parallel-then-merge: Tracks 1 and 2 at once in worktrees from `feat/rm-evidence-images`; Track 3 after Track 2 merges into it; Track 4 after Tracks 1 and 3 merge.
- **Shared checkout**: other sessions may use the main checkout and run gin-console-rm-project-timeline in parallel; this epic never switches the main checkout. Right before merging to `master` at ship, compare `origin/master` with the base of the branch.

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, and `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-rm-evidence-images --against master` prints `ok` and `gin specs trace --change gin-console-rm-evidence-images` reports no missing REQ
- [ ] `gin-qa cases check --change gin-console-rm-evidence-images` prints `ok`
- [ ] Manual check on the built UI: gin-console-3kd shows its screenshot; with `evidence_roots: [/home/gin/infra/bug-sync-mcp/data/attachments]` on qwikfone, a qwikfone bug shows its screenshot; a description with an external image makes no request to that host.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Provider roles describe responsibility rather than filename patterns.
- gin-console-rm-shared-attachments depends on this epic and reuses `ImagesPanel` and `Lightbox` for `attachment:` images.
- Deliverable merge-holds apply exclusively to the Parent Bead (`gin-console-rm-evidence-images`). Individual track beads close after tests and review pass so dependents unblock.
