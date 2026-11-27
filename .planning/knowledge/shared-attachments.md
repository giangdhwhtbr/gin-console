# Shared bead attachments

**Context**
Epic `gin-console-rm-shared-attachments` (2026-11-27) shows the screenshots that `gin attach add` (gin-workflow 3.5.0, gin-workflow-s6fv) put in the shared store, whoever took them. A bead lists them in `metadata.attachments` (`sha256`, `name`, `mime`, `bytes`, `caption`, `case`, `step`, `added_by`, `added_at`, `store`, `path`, `pruned_at`), its text points at them as `![caption](attachment:<sha256>)`, and the `git-ref` store keeps blobs at `<aa>/<sha256>` on `refs/gin/attachments`. gin's reader contract fetches with `+refs/gin/attachments:refs/gin/attachments`, which drops unpushed blobs of a clone that writes attachments, and gin keeps the remote tip on `refs/gin/attachments-origin` to tell a prune from a new attachment (`attach_gitref.py`); the projects the console reads are such clones.

**Decision/Solution**
- ADR 0006: the console fetches into its own ref, `git fetch --quiet --no-write-fetch-head origin +refs/gin/attachments:refs/gin-console/attachments`, in the same `PullService` job right after `bd dolt pull` (whatever the pull's result), and reads `refs/gin/attachments` first, then its own ref. It never moves gin's refs, never pushes, never runs `gin attach`. Only three git forms run: that fetch, `git ls-tree -r --name-only <ref>` and `git cat-file -s|blob <ref>:<aa>/<sha>` (REQ-BEADS-035).
- `beads/attachments.py` owns the store: `run_git` (bytes stdout, 30 s, `LC_ALL=C`, `LANGUAGE=C`, `GIT_TERMINAL_PROMPT=0`, `stdin=DEVNULL`, so `pull.py` can match git's English stderr: "couldn't find remote ref" → `no_store`, "does not appear to be a git repository" → `no_remote`), `entries`, `AttachmentStore` (listing once per ref per export snapshot, only for a project with a git-ref entry; a failing first ref skips the second, a failing second ref keeps the first's paths), `served` (size from `cat-file -s` before the blob, SHA-256, magic bytes). The `local` store is `.agent-workflow/attachments/<aa>/<sha>` under the project `path`, opened with the `_load` of `images.py`.
- bd exports each list-valued metadata key as JSON text inside the `metadata` object (gin writes `bd update --set-metadata attachments=<json.dumps(list)>`), so `entries` json-loads a string and still accepts a list; the same holds for `milestone_moves` and `points_history` (`beads/lanes.py` `claim_of`, `reports/history.py`). Fixtures that stand for gin's output use the string form; the first implementation read only lists and showed nothing on real data while its tests passed.
- `images.py` makes an image a file, an attachment or both: a `local:` line right under an `attachment:` image is one image, served as the attachment when it is present, else as the file; unnamed entries follow the text images within the 50 limit. `BeadImage` gains `sha256`, `served_as`, `reason` (`not_listed`, `pruned`, `unsupported_store`, `not_fetched`). `/images/{n}` serves only files; `/attachments/{sha256}` serves blobs with `Cache-Control: private, max-age=31536000, immutable`.
- `images.py` and `attachments.py` import each other: attachments imports the file helpers at module level; images imports attachments types only under `TYPE_CHECKING` and `entries` inside `_entries()`.
- Frontend: `imageAddress(project, id, image)` picks the route by `served_as`; `findImage` matches `attachment:<sha>` by `sha256` before the path; tiles show the reason text and the caption when an `<img>` fails; `PullNote` carries a `kind` for the fetch note.

**Consequences**
- The console writes git objects and `refs/gin-console/attachments` into each project's `.git`; `git push --mirror` would send that ref.
- Reading a project with git-ref entries starts `git ls-tree` (per snapshot) and `git cat-file` (per request); a project without them starts none.
- `ls-tree` from a subdirectory lists only that subtree; projects are configured at the repository root, where gin keeps its stores.
- `s3` entries show as "Stored where this host cannot read it".
- Tests: `backend/tests/conftest.py` `no_real_git` fails any test that starts git through `subprocess.run`; every `create_app` that refreshes or schedules pulls passes `run_git=FakeGit()` and `run_bd=FakeBd()` (`tests/fake_git.py`).

**References**
- `docs/changes/archive/2026-11-27-gin-console-rm-shared-attachments-shared-attachments/`, `docs/adr/0006-console-fetches-attachments.md`
- `backend/src/gin_console/beads/{attachments,images,pull}.py`, `backend/tests/{fake_git.py,conftest.py,test_bead_attachments*.py}`, `frontend/src/features/beads/images/`, `frontend/src/features/beads/PullNote.tsx`
- Beads: `gin-console-rm-shared-attachments` (`.1` to `.5`); related [bead-images](bead-images.md), [beads-pull](beads-pull.md)

**Scope**
Anything that reads gin's attachment stores, runs git from the console, or reads list-valued bead metadata.
