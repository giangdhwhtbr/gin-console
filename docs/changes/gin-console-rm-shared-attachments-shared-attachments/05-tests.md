# Tests: Shared bead attachments

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| MANUAL-1 | REQ-BEADS-031, REQ-BEADS-032, REQ-BEADS-033, REQ-UI-028 | manual | not run |

## MANUAL-1: Screenshot added in one clone shows in a console reading another clone

Real git and real Dolt, because no automated test starts `git`, `bd` or `gin`.

Setup:
- Two clones of gin-console, `clone-1` and `clone-2`, with the same `origin` and the same Beads remote.
- A console that lists `clone-2` as a project, running a build with this change. Its project has `pull` on.
- A PNG file `shot.png` on the machine of `clone-1`.

Steps:
1. In `clone-1`, create a bug with `bd create "Screenshot test" -t bug`, and note its id.
2. In `clone-1`, run `gin attach add <bug-id> shot.png`.
3. In `clone-1`, run `gin attach push`.
4. In `clone-1`, run `bd dolt push`.
5. Open the bug in the console that reads `clone-2`: `/beads/<project>/<bug-id>`.
6. Press Refresh.
7. Click the screenshot tile in the Images panel.

Expected:
- After step 5 the bug is not found, or its Images panel is missing the screenshot, because `clone-2` has not pulled yet.
- After step 6 the Images panel shows "Images (1)" and the tile shows the screenshot, loaded from `/api/beads/<project>/<bug-id>/attachments/<sha256>`.
- After step 7 the lightbox opens with "1 of 1" and the link "Open original" to the same attachment address.
- `git for-each-ref refs/gin-console/attachments` in `clone-2` lists the ref, and `refs/gin/attachments` in `clone-2` is unchanged.
- The page shows no note "Fetching attachments of ... failed".
