# Bead images from local files

**Context**
Epic `gin-console-rm-evidence-images` shows the screenshots a bead names (description and notes) when the files are on the console host: inline in the description, an Images panel, a lightbox, and an image indicator on cards and rows. Measured on 2026-11-26: in qwikfone, 47 of the 48 bug screenshots on this host sit outside the project folder (bug-sync-mcp writes them under `/home/gin/infra/bug-sync-mcp/data/attachments`, others are under `~/brain/qwikfone`), so a project-only rule would hide them. gin-qa 3.5.3 writes each screenshot as `- ![<TC-ID> step <n>: <title>](attachment:<sha>)` followed by `  local: <path>`, or `- <path>` when `gin attach` fails.

**Decision/Solution**
- Allowed folders: the project `path` and the folders of `evidence_roots` per project (REQ-CONFIG-008). The browser never sends a path: `GET /api/beads/{project}/{id}/images/{n}` serves only the n-th image the bead names, and every failure answers one 404 body (also an unreadable export).
- Parsing (`beads/images.py`, REQ-BEADS-026): Markdown image and link addresses, `local:` lines and standalone paths; Markdown addresses are percent-decoded; `file://` and `file://localhost` become the path, `file:///C:/` a drive path, another host is dropped. Bead text is untrusted (dolt pull, bug-sync-mcp), so every pattern must stay linear: a lazy group followed by an optional run and an anchor (`(.*?)[ \t]*$`) is quadratic on long space runs (a 32 KB `local:` line took 6.4 s). Timing tests on this shared host compare n with 2n (best of 3, up to 3 attempts) plus a 3 s absolute guard; a fixed 0.5 s limit was flaky.
- Reading (REQ-BEADS-027, REQ-BEADS-028): text checks first (`..`, `\`, NUL, stray `:`), then resolve with symlinks; open once with `O_NONBLOCK | O_NOFOLLOW | O_BINARY` (`getattr` defaults on Windows), check `S_ISREG`, size (10 MB) and `(st_dev, st_ino)` on the fd, then confirm where the open file lives with `os.readlink('/proc/self/fd/<fd>')` (not `realpath`, which walks a swapped link again), else resolve again and compare inodes. Magic bytes decide the type (PNG, JPEG, GIF, WebP; never SVG).
- `ImageIndex` computes the images of a project once per export snapshot object, with one lock per project; the folders are resolved once per computation.
- Frontend: `features/beads/images/match.ts` `imagePath()` applies the same `file:` and percent rules as the backend, so an inline image matches the image the backend listed. The lightbox is a base-ui `Dialog` with `initialFocus` on the popup (jsdom does not move focus otherwise).

**Consequences**
- An `evidence_roots` entry that is a symlink to `/` makes every image on the host servable: it is the operator's choice.
- `attachment:<sha>` images still show as text; gin-console-rm-shared-attachments reuses `ImagesPanel` and `Lightbox` for them.

**References**
- `docs/changes/archive/2026-11-27-gin-console-rm-evidence-images-evidence-images/`
- `backend/src/gin_console/beads/images.py`, `backend/tests/test_bead_images.py`, `frontend/src/features/beads/images/`
- Beads: `gin-console-rm-evidence-images` (`.1` to `.4`)

**Scope**
Bead images in the beads context, the `evidence_roots` config field, and every Markdown view.
