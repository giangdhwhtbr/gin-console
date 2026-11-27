# Spec Delta: Shared bead attachments

In the scenarios, `A`, `B` and `C` stand for three different sha256 values written as 64 lower-case hex digits, and `<aa>` for the first two digits of the value it goes with.

## ADDED

### REQ-BEADS-031: Available attachment
Type: business-rule
An attachment of a bead (REQ-BEADS-026) SHALL be available only when the bead's `metadata.attachments` holds an entry with its `sha256`, that entry has no `pruned_at`, and either the entry's `store` is `git-ref` or missing and the blob `<aa>/<sha256>` is in the ref `refs/gin/attachments` or the ref `refs/gin-console/attachments` of the project's repository, or the entry's `store` is `local` and `.agent-workflow/attachments/<aa>/<sha256>` under the project's `path`, with every symlink resolved, is a regular file inside that `path`. The server SHALL NOT use the entry's `path`, `mime` or `bytes`, and SHALL check the bytes of an attachment when it is requested (REQ-BEADS-032). An attachment that is not available SHALL have the `reason` `not_listed` when the bead has no entry with its `sha256`, `pruned` when the entry has `pruned_at`, `unsupported_store` when the entry's `store` is another value (such as `s3`), and `not_fetched` otherwise. The server SHALL list the blobs of each of the two refs with `git ls-tree -r --name-only` at most once per export snapshot of the project (REQ-BEADS-012), and only when an entry of a bead of that project has the `git-ref` store or no store; a ref that does not exist SHALL count as having no blobs.

#### Scenario: Blob in the shared store
- GIVEN bead `a-1` of `alpha` with the entry `{sha256: A, store: "git-ref"}` and the blob `<aa>/A` in `refs/gin-console/attachments` only
- WHEN its attachment `A` is checked
- THEN it is available

#### Scenario: Blob added on this host
- GIVEN bead `a-1` with the entry `{sha256: A}` and the blob `<aa>/A` in `refs/gin/attachments` only
- WHEN its attachment `A` is checked
- THEN it is available

#### Scenario: Reasons
- GIVEN bead `a-1` whose description names `attachment:C`, with the entries `{sha256: A, store: "git-ref", pruned_at: "2026-11-20T10:00:00Z"}` and `{sha256: B, store: "s3"}`, and a project whose refs hold no blob
- WHEN its attachments are checked
- THEN `C` has the reason `not_listed`, `A` the reason `pruned` and `B` the reason `unsupported_store`, and none is available

#### Scenario: Not fetched yet
- GIVEN bead `a-1` with the entry `{sha256: A, store: "git-ref"}` and a project with neither ref
- WHEN its attachment `A` is checked
- THEN it is not available with the reason `not_fetched`

#### Scenario: Local store
- GIVEN project `alpha` at `/p/alpha`, bead `a-1` with the entries `{sha256: A, store: "local"}` and `{sha256: B, store: "local"}`, the file `/p/alpha/.agent-workflow/attachments/<aa>/A`, and `/p/alpha/.agent-workflow/attachments/<aa>/B` a symlink to `/tmp/B`
- WHEN its attachments are checked
- THEN `A` is available and `B` is not, with the reason `not_fetched`

#### Scenario: No git without shared entries
- GIVEN project `beta` whose beads have no entry, or only entries with the `local` store
- WHEN a client lists its beads and opens one of them
- THEN no `git` process was started

#### Scenario: One listing per snapshot
- GIVEN project `alpha` with git-ref entries on two beads
- WHEN a client lists its beads twice and opens both beads, with no change to `.beads/issues.jsonl`
- THEN `git ls-tree` ran at most once for each of the two refs

### REQ-BEADS-032: Attachment request
WHEN a client requests `GET /api/beads/{project}/{id}/attachments/{sha256}`, the server SHALL check that `sha256` is 64 lower-case hex digits and is the attachment of an image of the bead (REQ-BEADS-026), check that attachment again as REQ-BEADS-031 says, and read its bytes with `git cat-file` from `refs/gin/attachments`, else from `refs/gin-console/attachments`, or, for the `local` store, from its file opened once without following a link put in its place, as REQ-BEADS-027 opens a file. It SHALL respond 200 only when the bytes are at most 10 MB, their SHA-256 is `sha256`, and they start with the bytes of a PNG, JPEG, GIF or WebP file, with those bytes, `Content-Type` `image/png`, `image/jpeg`, `image/gif` or `image/webp` from the first bytes, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline` and `Cache-Control: private, max-age=31536000, immutable`. It SHALL respond 404 with the body of REQ-BEADS-028, without saying why, in every other case, and SHALL NOT take a path from the client.

#### Scenario: Served
- GIVEN bead `a-1` of `alpha` with the entry `{sha256: A}` and the PNG blob `<aa>/A` of 300 KB, whose SHA-256 is `A`, in `refs/gin-console/attachments`
- WHEN a client requests `/api/beads/alpha/a-1/attachments/A`
- THEN the response is 200 with `image/png`, the blob's bytes, `Cache-Control: private, max-age=31536000, immutable` and the other three headers

#### Scenario: Bytes refused
- GIVEN bead `a-1` with the entries `A`, `B` and `C`, whose blobs are a PNG whose SHA-256 is not `A`, a text file whose SHA-256 is `B`, and a PNG of 11 MB whose SHA-256 is `C`
- WHEN a client requests the three attachments
- THEN every response is 404 with the body `{"error":"not found"}`

#### Scenario: Not served
- GIVEN bead `a-1` with the pruned entry `A` and bead `a-2` with the available entry `B`
- WHEN a client requests attachment `A` of `a-1`, attachment `B` of `a-1`, attachment `ab12` of `a-1`, the upper-case form of `B` on `a-2`, and attachment `B` of `a-9`
- THEN every response is 404 with the same body

### REQ-BEADS-033: Fetch shared attachments
WHEN the server pulls a project (REQ-BEADS-016), it SHALL, once that project's `bd dolt pull` has ended whatever its result, run `git fetch --quiet --no-write-fetch-head origin +refs/gin/attachments:refs/gin-console/attachments` in the project's directory for at most 30 seconds, within the limits of REQ-BEADS-016 (no project that sets `pull: false` or whose directory does not exist, at most four projects at a time, one pull of a project at a time), and SHALL keep for each project the result of its last fetch: `at` (the time the fetch ended, ISO 8601), `status` `ok` when the command exits 0, `no_store` when its output says that it could not find the remote ref, `no_remote` when its output says that `origin` does not appear to be a git repository, or `error` otherwise, and `error` (the last non-empty line of the command's output, "git fetch timed out" after 30 seconds, or "git not found") or `null`. `GET /api/projects/beads` SHALL include for each project `attachments_fetch`: that result, or `null` when the project has not been fetched since the server started or sets `pull: false`. `POST /api/refresh` and the scheduled pull (REQ-BEADS-017) SHALL wait for these fetches to end before they drop the snapshots, a failed fetch SHALL NOT fail the request that caused it, and the scheduled pull SHALL log each project whose fetch failed with its name and error.

#### Scenario: Fetch after the pull
- GIVEN project A whose `bd dolt pull` exits 1 with a merge conflict and whose `git fetch` exits 0
- WHEN a client sends `POST /api/refresh`
- THEN `git fetch` ran in A's directory after `bd dolt pull` ended, the response is 204, and A has `pull.status` `error` and `attachments_fetch.status` `ok`

#### Scenario: No store, no remote
- GIVEN project A whose `git fetch` exits 128 with "fatal: couldn't find remote ref refs/gin/attachments" and project B whose `git fetch` exits 128 with "fatal: 'origin' does not appear to be a git repository"
- WHEN the server pulls
- THEN A has `attachments_fetch.status` `no_store` and B has `no_remote`, both with `error` `null`

#### Scenario: Failure and timeout
- GIVEN project A whose `git fetch` exits 128 with "fatal: Could not read from remote repository." and project B whose `git fetch` runs longer than 30 seconds
- WHEN the scheduled pull runs
- THEN A has `attachments_fetch.status` `error` with that line, B has `error` "git fetch timed out", and the server log names both

#### Scenario: Opted out
- GIVEN project A with `pull: false`
- WHEN the server pulls
- THEN no `git` process ran in A's directory and A has `attachments_fetch` `null`

### REQ-BEADS-034: Attachment fetch status display
WHERE the `attachments_fetch` of a project in `GET /api/projects/beads` has `status` `error`, the Beads page and the My Tasks page SHALL show, above their list and while that project is the current project (REQ-UI-124), the note "Fetching attachments of <project> failed: <error>. Run `git fetch origin +refs/gin/attachments:refs/gin-console/attachments` in <path>." once, and SHALL show no such note for another project or for a project whose `attachments_fetch` is `null`, missing, or not `error`.

#### Scenario: Failed fetch note
- GIVEN project A whose `attachments_fetch.status` is `error` and project B whose `attachments_fetch.status` is `no_store`
- WHEN the Beads page opens with A selected, and then with B selected
- THEN the page shows one note naming A, its error, the `git fetch` command and A's path above the list for A, and no note for B

#### Scenario: Older backend
- GIVEN projects without an `attachments_fetch` key
- WHEN the Beads and My Tasks pages load
- THEN no fetch note is shown

### REQ-BEADS-035: Git commands of the console
Type: non-functional
Category: security
The server SHALL start `git` only as `git fetch` with the arguments of REQ-BEADS-033, `git ls-tree -r --name-only` on `refs/gin/attachments` or `refs/gin-console/attachments` (REQ-BEADS-031), and `git cat-file` on a blob `<aa>/<sha256>` of one of those refs (REQ-BEADS-032), each in a configured project's directory. It SHALL NOT create, move or delete any ref other than `refs/gin-console/attachments`, SHALL NOT push, SHALL NOT change `refs/gin/attachments` or `refs/gin/attachments-origin`, and SHALL NOT run `gin attach`.

#### Scenario: Only the allowed commands
- GIVEN project A with git-ref entries and a recording git runner
- WHEN a client refreshes, lists A's beads, opens a bead and requests one of its attachments
- THEN every recorded command is one of the three forms above, run in A's directory, and none names `refs/gin/attachments-origin`, `push` or `update-ref`

## MODIFIED

### REQ-BEADS-002: Bead detail
<!-- base: 416355c8f31236631eabbd7b2313fa902e7931e6d94f461cbb97942bb87efdf2 -->
WHEN a client requests `GET /api/beads/{project}/{id}`, the server SHALL return the bead with the fields of REQ-BEADS-001 plus `description`, `dependencies` and `dependents` (each with `id`, `title`, `status` and `type`, where `type` is `blocks` or `parent-child`), `bugs` (each bead of type `bug` that has a `discovered-from` dependency on this bead, open or closed, with `id`, `title`, `status` and `type` `discovered-from`) `images` (the images of REQ-BEADS-026, each with `n`, `path`, `sha256` and `caption` as REQ-BEADS-026 says, `available` and `served_as` (`attachment`, `file` or `null`) as REQ-BEADS-027 says, and `reason`: for an image that has a `sha256` and is not available, the reason of its attachment (REQ-BEADS-031), else `null`) and, for an epic, `children` (each with `id`, `title`, `status` and `prep`, closed children included), and SHALL respond 404 when the project or the bead does not exist. A bead SHALL be a prep task when its `labels` hold `prep` and no label starts with `track:` or `req:`. The children of an epic that are not prep tasks are its tracks. The `prep` field of a child SHALL be true for a prep task and false for a track.

#### Scenario: Dependencies and dependents
- GIVEN a bead blocked by one bead and blocking another
- WHEN a client requests its detail
- THEN `dependencies` lists the first with type `blocks` and `dependents` lists the second

#### Scenario: Epic children
- GIVEN an epic with 3 children, one of them closed
- WHEN a client requests its detail
- THEN `children` lists all 3 with their statuses

#### Scenario: Bugs found
- GIVEN a bead with an open bug, a closed bug and an epic that each have a `discovered-from` dependency on it
- WHEN a client requests its detail
- THEN `bugs` lists the two bugs with type `discovered-from` and not the epic, and neither appears in `dependents` or `children`

#### Scenario: Unknown bead
- GIVEN a configured project without a bead `x-1`
- WHEN a client requests `GET /api/beads/<project>/x-1`
- THEN the response is 404

#### Scenario: Prep child
- GIVEN epic `e-1` with tracks `t-1` and `t-2`, prep task `p-1` labelled `prep` and `prep:mockup`, and child `t-3` labelled `prep` and `track:api`
- WHEN a client requests the detail of `e-1`
- THEN `children` lists `t-1`, `t-2`, `t-3` and `p-1`, with `prep` true for `p-1` only

#### Scenario: Images
- GIVEN bug `b-1` whose description names `qa/evidence/r1/01.png`, present in the project, and `/tmp/x.png`
- WHEN a client requests its detail
- THEN `images` is `{n: 1, path: "qa/evidence/r1/01.png", sha256: null, caption: "01.png", available: true, served_as: "file", reason: null}` and `{n: 2, path: "/tmp/x.png", sha256: null, caption: "x.png", available: false, served_as: null, reason: null}`

#### Scenario: Attachment images
- GIVEN bug `b-1` whose description holds `![Step 1](attachment:A)` and whose entries are `{sha256: A}`, available, and `{sha256: B, name: "02.png", pruned_at: "2026-11-20T10:00:00Z"}`
- WHEN a client requests its detail
- THEN `images` is `{n: 1, path: null, sha256: A, caption: "Step 1", available: true, served_as: "attachment", reason: null}` and `{n: 2, path: null, sha256: B, caption: "02.png", available: false, served_as: null, reason: "pruned"}`

### REQ-BEADS-026: Images a bead names
<!-- base: ac85fc9c0660a17d57c6cd7b0dcdd43c80416a949d4d32bb0d9a81afa1cb78ff -->
Type: business-rule
The server SHALL take as the images of a bead, in this order, the files and attachments that its description, and then its notes, name, and then the attachments of its `metadata.attachments` that the text does not name. A file is a path ending in `.png`, `.jpg`, `.jpeg`, `.gif` or `.webp` (in any letter case) named in any of these forms: the address of a Markdown image, the target of a Markdown link, the rest of a line starting with `local:` after optional spaces, and a path standing alone between spaces, backticks or the start and end of a line. An attachment is a `sha256`: the 64 hex digits of an `attachment:<sha256>` address of a Markdown image or target of a Markdown link, or the `sha256` of an entry of `metadata.attachments` when it is 64 hex digits, in either case in any letter case and kept in lower case. It SHALL:
- percent-decode the address of a Markdown image or link; turn a `file:` address into its path, dropping `file://` or `file://localhost`, and the `/` before a Windows drive (`file:///C:/a.png` is `C:/a.png`), and drop a `file:` address that names another host; drop any `http:`, `https:` or other address with a scheme, and an `attachment:` address that is not 64 hex digits;
- take a file named on a `local:` line, when the line right above it holds a Markdown image whose address is an attachment, as the same image as that attachment: one image with both its `sha256` and its `path`;
- read a path starting with `~/` from the home folder of the user running the console, and a relative path from the project's `path`;
- read `metadata.attachments` as a list, or as the JSON text of a list as `bd` exports it, ignore it otherwise, and ignore an entry of it that is not an object or has no `sha256` of 64 hex digits;
- keep the order of first appearance, keep a path or a `sha256` met again once, and keep at most 50 images;
- give each image `n` (1, 2, … in that order), `path` (as written, without `file://`, or `null` for an attachment without a `local:` line), `sha256` (or `null` for a file), and `caption`: the alt text of the Markdown image or the text of the link that names it first, else, for a `local:` line, the alt text of a Markdown image on the line right above it, else the `caption` of its entry, else the `name` of its entry, else its file name, else the first 12 digits of its `sha256`, taking only a non-empty string at each step.

#### Scenario: gin-qa evidence
- GIVEN a bug whose description holds `## Evidence`, `- ![TC-UI-115 step 1: Open the list](attachment:A)` and `  local: qa/evidence/r1/tc-ui-115/01.png`
- WHEN its images are found
- THEN it has one image, `n` 1, `sha256` `A`, `path` `qa/evidence/r1/tc-ui-115/01.png` and caption "TC-UI-115 step 1: Open the list"

#### Scenario: Entries the text does not name
- GIVEN a bug whose description holds `![Step 1](attachment:A)` and `shots/c.png`, and whose `metadata.attachments` is the JSON text of `[{sha256: B, caption: "Step 2"}, {sha256: A}, {sha256: "x"}, "oops"]`
- WHEN its images are found
- THEN its images are `A` (caption "Step 1"), `shots/c.png` and `B` (caption "Step 2"), numbered 1 to 3

#### Scenario: Bad attachment addresses
- GIVEN a bead whose description holds `![key](attachment:ab12)` and whose `metadata.attachments` is `"none"`
- WHEN its images are found
- THEN it has no images

#### Scenario: Attachment named twice
- GIVEN a bead whose description holds `![First](attachment:A)` and whose notes hold `[again](attachment:<A in upper case>)`
- WHEN its images are found
- THEN it has one image, `sha256` `A`, caption "First"

#### Scenario: File link and absolute path line
- GIVEN a bug with `[BUG-005_1.png](file:///home/gin/att/BUG-005_1.png)` followed by ``Absolute Path: `/home/gin/att/BUG-005_1.png` ``
- WHEN its images are found
- THEN it has one image with `path` `/home/gin/att/BUG-005_1.png` and caption `BUG-005_1.png`

#### Scenario: Forms and order
- GIVEN a task whose description names `![Before](shots/a.png)`, then `see ~/brain/b.JPG`, then `https://example.com/c.png`, and whose notes name `shots/a.png` and `d.webp`
- WHEN its images are found
- THEN its images are `shots/a.png` (caption "Before"), `~/brain/b.JPG` and `d.webp`, numbered 1 to 3

#### Scenario: Limit
- GIVEN a bead whose description names 60 different PNG paths
- WHEN its images are found
- THEN it has the first 50

### REQ-BEADS-027: Available image
<!-- base: 864c75b789c0277bc201c23b11c6b054f54a3a06f3f471ccf20a6cf00c107eb4 -->
Type: business-rule
An image of a bead (REQ-BEADS-026) SHALL be available when its attachment is available (REQ-BEADS-031) or its file is available, and an available image SHALL be served as an attachment (`served_as` `attachment`) when its attachment is available, else as a file (`file`); an image that is not available has `served_as` `null`. A file SHALL be available only when its path holds no `..` part, no `\`, no NUL and no `:` other than in a Windows drive of an absolute path, and the file it names, with every symlink resolved, is a regular file inside the project's `path` or inside a folder of its `evidence_roots` (REQ-CONFIG-008), each folder taken with its own symlinks resolved, is at most 10 MB, and starts with the bytes of a PNG, JPEG, GIF or WebP file. The server SHALL check the text rules before touching the disk, and SHALL treat a file it cannot read as not available.

#### Scenario: Inside the project
- GIVEN project `alpha` at `/p/alpha` and a PNG file `/p/alpha/qa/evidence/r1/01.png` of 200 KB
- WHEN the image `qa/evidence/r1/01.png` of a bead of `alpha` is checked
- THEN it is available

#### Scenario: Listed folder
- GIVEN project `q` with `evidence_roots: [/srv/att]` and a JPEG file `/srv/att/BUG-5.jpg`
- WHEN the image `/srv/att/BUG-5.jpg` of a bead of `q` is checked, and then the same path for a bead of `alpha`
- THEN it is available for `q` and not for `alpha`

#### Scenario: Refused paths
- GIVEN project `alpha` at `/p/alpha` with the PNG file `/p/alpha/qa/evidence/r1/01.png`, a PNG file `/tmp/x.png`, a symlink `/p/alpha/link.png` to `/tmp/x.png`, and a symlink `/p/alpha/shots` to `/p/alpha/qa/evidence`
- WHEN the images `/tmp/x.png`, `link.png`, `../alpha/qa/evidence/r1/01.png` and `shots/r1/01.png` are checked
- THEN only `shots/r1/01.png` is available

#### Scenario: Not an image
- GIVEN in the project folder a file `fake.png` that holds text, an SVG file `logo.png`, a PNG file of 11 MB and a missing `gone.png`
- WHEN they are checked
- THEN none is available

#### Scenario: Attachment first, file as fallback
- GIVEN bug `a-1` with the images `A` + `qa/evidence/r1/01.png` and `B` + `qa/evidence/r1/02.png` (each an attachment with a `local:` line), both files available, attachment `A` available and attachment `B` not fetched
- WHEN its images are checked
- THEN image 1 is available with `served_as` `attachment`, and image 2 is available with `served_as` `file`

### REQ-BEADS-028: Image request
<!-- base: 487cfa9ac30a5006d3f8109c8f5a7640a93fc32948a6deb315f3394a0f77de41 -->
WHEN a client requests `GET /api/beads/{project}/{id}/images/{n}`, the server SHALL check the file of image `n` of the bead (REQ-BEADS-026) again as REQ-BEADS-027 says and, when it is available, SHALL respond 200 with the file's bytes, `Content-Type` `image/png`, `image/jpeg`, `image/gif` or `image/webp` from its first bytes, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline` and `Cache-Control: private, no-cache`. It SHALL respond 404, without saying why, when the project, the bead or the image `n` does not exist, the image has no file (`path` `null`), or its file is not available, and SHALL NOT take a path from the client.

#### Scenario: Served
- GIVEN bead `a-1` of `alpha` whose image 1 is an available PNG
- WHEN a client requests `/api/beads/alpha/a-1/images/1`
- THEN the response is 200 with `image/png`, the file's bytes and the four headers

#### Scenario: Not served
- GIVEN bead `a-1` with one available image and one image outside the allowed folders
- WHEN a client requests images 2, 3 and 0 of `a-1`, image 1 of `a-9`, and image 1 of project `nope`
- THEN every response is 404 with the same body

#### Scenario: Removed after the snapshot
- GIVEN bead `a-1` whose image 1 was available when the export was read and was deleted since
- WHEN a client requests `/api/beads/alpha/a-1/images/1`
- THEN the response is 404

#### Scenario: Attachment without a file
- GIVEN bead `a-1` whose image 1 is the available attachment `A` with no `local:` line
- WHEN a client requests `/api/beads/alpha/a-1/images/1`
- THEN the response is 404

### REQ-BEADS-029: Images panel
<!-- base: 79ee5c39080cadae0d2b590a590fa421b9734c9975321a0cba6896588cb988f2 -->
WHEN a bead has images (REQ-BEADS-002 `images`), the bead page, the epic page and the details panel SHALL show under the description a panel "Images (<count>)" with one tile per image in the order of `n`, each with its number and its caption: for an available image, the image itself with the caption as `alt`, loaded lazily from its address, which is `/api/beads/{project}/{id}/attachments/{sha256}` (REQ-BEADS-032) when `served_as` is `attachment` and `/api/beads/{project}/{id}/images/{n}` (REQ-BEADS-028) when it is `file`; for one that is not available, the text of its `reason`, "Not attached to this bead" for `not_listed`, "Pruned" for `pruned`, "Stored where this host cannot read it" for `unsupported_store`, "Not fetched yet" for `not_fetched` and "Not on this host" for `null`, followed by its `path` as written when it has one. WHEN the image of an available tile fails to load, the tile SHALL show its caption instead of a broken image. Clicking or pressing Enter on an available tile SHALL open the lightbox of REQ-BEADS-030 on that image. The panel SHALL NOT show for a bead without images, and its tiles SHALL wrap so that the page does not scroll sideways at 390px.

#### Scenario: Two images, one missing
- GIVEN bug `a-1` with image 1 available and caption `01.png`, and image 2 not available with path `/tmp/x.png`
- WHEN its page is shown
- THEN the panel reads "Images (2)", tile 1 shows the image with `alt` `01.png`, and tile 2 reads "Not on this host" and `/tmp/x.png`

#### Scenario: Attachments
- GIVEN bug `a-1` of `alpha` with image 1 the available attachment `A` (`served_as` `attachment`), image 2 a pruned attachment, image 3 an attachment not fetched with path `qa/evidence/r1/03.png`, and image 4 an attachment of the `s3` store
- WHEN its page is shown
- THEN tile 1 shows the image from `/api/beads/alpha/a-1/attachments/A`, tile 2 reads "Pruned", tile 3 reads "Not fetched yet" and `qa/evidence/r1/03.png`, and tile 4 reads "Stored where this host cannot read it"

#### Scenario: Image fails to load
- GIVEN bug `a-1` with image 1 available, whose address answers 404
- WHEN its page is shown
- THEN tile 1 shows its caption and no broken image

#### Scenario: No images
- GIVEN a bead whose `images` is empty
- WHEN its page is shown
- THEN there is no Images panel

### REQ-BEADS-030: Image lightbox
<!-- base: 9ca2034f284dd27135209d3818ba500fdf5a9f5048ad7d8e45551abe6fb6947e -->
The lightbox SHALL be a modal dialog that shows one available image of the bead large, its caption, "<k> of <m>" counting the available images, and a link "Open original" to its address (REQ-BEADS-029) opening in a new tab. WHILE it is open, ← and → SHALL show the previous and the next available image, without wrapping, and Escape or the close button SHALL close it and return the focus to the tile or link that opened it.

#### Scenario: Step through
- GIVEN bug `a-1` with available images 1 and 3 and a missing image 2
- WHEN the user opens image 1 and presses →
- THEN image 3 is shown with "2 of 2", and pressing → again keeps it

#### Scenario: Close
- GIVEN the lightbox opened from tile 1
- WHEN the user presses Escape
- THEN the lightbox closes and tile 1 has the focus

#### Scenario: Open original
- GIVEN the lightbox shows image 1 of `a-1` in `alpha`
- WHEN the user looks at "Open original"
- THEN it links to `/api/beads/alpha/a-1/images/1` with `target="_blank"` and `rel="noreferrer"`

#### Scenario: Open original of an attachment
- GIVEN the lightbox shows image 2 of `a-1` in `alpha`, the attachment `A` served as an attachment
- WHEN the user looks at "Open original"
- THEN it links to `/api/beads/alpha/a-1/attachments/A`

### REQ-UI-132: Tooltips for marks and counts
<!-- base: 87ad72f4dcef122531d2449fca9470527b1eae51b14aea04af280278a2eac73d -->
WHEN the pointer rests on a state mark (REQ-UI-064), a size or points value, the word Prep or a Prep count, a lane or lane count, a strand (REQ-UI-138), a Gantt verdict (REQ-MILESTONE-UI-024), a comment, dependency or image indicator (REQ-UI-066), or a count of blocked, done or in-progress beads, and WHEN keyboard focus reaches one of them that takes focus, the frontend SHALL show within 500 ms a tooltip with one sentence that says what it means, and for a count the rule it counts by and the scope it counts in, SHALL tie the tooltip to the element with `aria-describedby`, and SHALL close it on Escape, on blur and when the pointer leaves; the native `title` SHALL remain only for text cut short (REQ-UI-107).

#### Scenario: Blocked count
- GIVEN the Board of `example` whose Blocked column holds 4 beads
- WHEN the pointer rests on the count of that column
- THEN a tooltip reads "Blocked: status blocked, or waiting on an open blocker of its own or of a parent. Prep tasks are counted apart. Counted in this column." and Escape closes it

#### Scenario: Dependency indicator
- GIVEN a bead card with the dependency indicator 2
- WHEN the pointer rests on the indicator
- THEN a tooltip says what the 2 dependencies are, and the indicator has no `title`

#### Scenario: Image indicator
- GIVEN a bead card with the image indicator 2
- WHEN the pointer rests on the indicator
- THEN a tooltip says that it counts the screenshots of the bead that this console can show: files on the console host and attachments in the shared store

### REQ-UI-028: Bead detail
<!-- base: 5c612d027b51da25fb029a6dc7aba31971eb58c8beab42737ed4da96372422f9 -->
The bead page SHALL show the bead's id, title and type, a line of facts with its state as REQ-UI-064 describes (for example "In progress", never the raw `in_progress`; for a milestone, its milestone status as REQ-MILESTONE-UI-022 describes), its priority as `P<n>` (REQ-UI-110) and its size as REQ-UI-110 describes, the reason of its points (`points_reason`) on its own line under that line, its labels, and its assignee (REQ-UI-135), creator (the person of `created_by`, else of `owner`, REQ-BEADS-023), creation and update times and comment count as label/value pairs (REQ-UI-110), each time written as REQ-UI-131 describes, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with the strand of its tracks (REQ-UI-138), from its `child_counts` (REQ-UI-130), when it has a track. WHEN an epic has prep tasks (REQ-BEADS-002), the bead page SHALL show "Prep x/y" next to the strand, where x is its closed prep tasks and y all its prep tasks, and SHALL mark each prep task in the children list with the word "Prep" (REQ-UI-140). Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text, except a link to an available image of the bead, by its path or by its `attachment:` address (REQ-BEADS-026, REQ-BEADS-027), which SHALL open the lightbox of REQ-BEADS-030 on it. A Markdown image that names an available image of the bead, by its path or by its `attachment:` address, SHALL show that image from its address (REQ-BEADS-029), at most 24rem high and never wider than the description, with its alt text, and SHALL open the lightbox when clicked. Wherever the console renders Markdown, an image whose address is `http` or `https` SHALL NOT be loaded and SHALL be shown as a link "Image: <alt> (<host>)" opening in a new tab, and any other image SHALL be shown as its alt text.
Source: `assets/2026-11-08/mockup/index.html#bead-detail`

#### Scenario: Markdown description
- GIVEN a bead whose description is `## Change` followed by `1. Format **dates**` and a fenced code block
- WHEN the page loads
- THEN the description shows a heading "Change", a numbered list item with "dates" in bold, and a code block

#### Scenario: Raw HTML stays text
- GIVEN a bead with a description containing `<script>x</script>` and `<img src=x onerror=alert(1)>`
- WHEN the page loads
- THEN both appear as text and no `script` or `img` element exists in the description

#### Scenario: Unsafe link
- GIVEN a bead with a description containing `[run](javascript:alert(1))` and `[docs](https://example.com)`
- WHEN the page loads
- THEN "run" is not a link, and "docs" links to `https://example.com` in a new tab

#### Scenario: Relations link inside the console
- GIVEN a bead with one dependency
- WHEN the page loads
- THEN the dependency shows its id, title and status and links to `/beads/<project>/<its id>`

#### Scenario: Epic progress
- GIVEN an epic with 4 children of which 3 are closed
- WHEN the page loads
- THEN the children are listed and the strand shows 4 beads and "3/4"

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the page of `e-1` loads
- THEN the strand reads "1/2", "Prep 1/1" is shown next to it, and the children list shows `t-1`, `t-2` and `p-1`, with the word "Prep" on `p-1` only

#### Scenario: Fact line and facts
- GIVEN in-progress P1 epic `e-3` with `points: 5`, `points_reason: "new endpoint and UI"`, owner `lead@example.com`, assignee `bao`, created by `lead`, created and updated at 2026-05-11 16:00:00 and 0 comments, shown in 2026
- WHEN its page loads
- THEN the fact line shows "In progress", "P1" and "5 pt" as text, none of them in a pill, the line under it reads "new endpoint and UI", and the facts read Assignee "bao", Created by "lead", Created "11 May, 16:00", Updated "11 May, 16:00" and Comments "0", with no Owner fact, each label in the muted color and each value in the text color

#### Scenario: No assignee
- GIVEN a task with owner `lead@example.com` and no assignee
- WHEN its page loads
- THEN the facts read Assignee "Unassigned" and Created by "lead"

#### Scenario: Bead image inline
- GIVEN a bug whose description holds `![Step 1](qa/evidence/r1/01.png)` and whose image 1 is that file, available
- WHEN the page loads and the user clicks the image
- THEN the description shows an image from `/api/beads/<project>/<id>/images/1` with `alt` "Step 1", and the lightbox opens on it

#### Scenario: Attachment image inline
- GIVEN a bug whose description holds `![Step 1](attachment:A)` followed by `  local: qa/evidence/r1/01.png`, whose image 1 is that pair, available and served as an attachment, and a bug with the same text whose attachment is not fetched and whose file is available
- WHEN each page loads
- THEN the first description shows one image from `/api/beads/<project>/<id>/attachments/A` and the second one image from `/api/beads/<project>/<id>/images/1`, each with `alt` "Step 1" and the `local:` line as text

#### Scenario: External image not loaded
- GIVEN a bead with a description containing `![chart](https://example.com/x.png)` and `![key](attachment:ab12)`
- WHEN the page loads
- THEN "Image: chart (example.com)" is a link to `https://example.com/x.png` in a new tab, "key" is text, no `img` element is in the description and no request goes to example.com

#### Scenario: Link to a bead image
- GIVEN a bug with `[BUG-5.png](file:///srv/att/BUG-5.png)` whose image 1 is that file, available, and `[shot](attachment:A)` whose image 2 is that attachment, available
- WHEN the user activates "BUG-5.png", and then "shot"
- THEN the lightbox opens on image 1, and then on image 2

## REMOVED
