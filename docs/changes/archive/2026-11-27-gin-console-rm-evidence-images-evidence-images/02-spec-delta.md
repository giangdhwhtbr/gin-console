# Spec Delta: Evidence images from local files

## ADDED

### REQ-CONFIG-008: Evidence folders
The config SHALL accept on each project entry an optional `evidence_roots` list of absolute folder paths (default empty), the folders besides the project's `path` from which images of its beads may be served (REQ-BEADS-027); IF an entry of `evidence_roots` is not an absolute path or the field is not a list, THEN the console SHALL exit with a non-zero status and a message naming the field (REQ-CONFIG-003). A listed folder that does not exist SHALL serve no image and SHALL NOT stop the console.

#### Scenario: Listed folders
- GIVEN project `qwikfone` with `evidence_roots: [/home/gin/infra/bug-sync-mcp/data/attachments]`
- WHEN the console starts
- THEN that folder is an evidence folder of `qwikfone` and of no other project

#### Scenario: Default
- GIVEN a project without `evidence_roots`
- WHEN the console starts
- THEN its only evidence folder is its `path`

#### Scenario: Relative folder
- GIVEN a project with `evidence_roots: [shots]`
- WHEN the console starts
- THEN it exits non-zero and the message names that project's `evidence_roots`

### REQ-BEADS-026: Images a bead names
Type: business-rule
The server SHALL take as the images of a bead the paths ending in `.png`, `.jpg`, `.jpeg`, `.gif` or `.webp` (in any letter case) that its description, and then its notes, name in any of these forms: the address of a Markdown image, the target of a Markdown link, the rest of a line starting with `local:` after optional spaces, and a path standing alone between spaces, backticks or the start and end of a line. It SHALL:
- percent-decode the address of a Markdown image or link; turn a `file:` address into its path, dropping `file://` or `file://localhost`, and the `/` before a Windows drive (`file:///C:/a.png` is `C:/a.png`), and drop a `file:` address that names another host; drop any `http:`, `https:`, `attachment:` or other address with a scheme;
- read a path starting with `~/` from the home folder of the user running the console, and a relative path from the project's `path`;
- keep the order of first appearance, keep a path met again once, and keep at most 50 images;
- give each image `n` (1, 2, … in that order), `path` (as written, without `file://`), and `caption`: the alt text of the Markdown image or the text of the link that names it first, else, for a `local:` line, the alt text of a Markdown image on the line right above it, else its file name.

#### Scenario: gin-qa evidence
- GIVEN a bug whose description holds `## Evidence`, `- ![TC-UI-115 step 1: Open the list](attachment:ab12)` and `  local: qa/evidence/r1/tc-ui-115/01.png`
- WHEN its images are found
- THEN it has one image, `n` 1, `path` `qa/evidence/r1/tc-ui-115/01.png`, caption "TC-UI-115 step 1: Open the list", and nothing for the `attachment:` address

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
Type: business-rule
An image of a bead (REQ-BEADS-026) SHALL be available only when its path holds no `..` part, no `\`, no NUL and no `:` other than in a Windows drive of an absolute path, and the file it names, with every symlink resolved, is a regular file inside the project's `path` or inside a folder of its `evidence_roots` (REQ-CONFIG-008), each folder taken with its own symlinks resolved, is at most 10 MB, and starts with the bytes of a PNG, JPEG, GIF or WebP file. The server SHALL check the text rules before touching the disk, and SHALL treat a file it cannot read as not available.

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

### REQ-BEADS-028: Image request
WHEN a client requests `GET /api/beads/{project}/{id}/images/{n}`, the server SHALL check image `n` of the bead (REQ-BEADS-026) again as REQ-BEADS-027 says and, when it is available, SHALL respond 200 with the file's bytes, `Content-Type` `image/png`, `image/jpeg`, `image/gif` or `image/webp` from its first bytes, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline` and `Cache-Control: private, no-cache`. It SHALL respond 404, without saying why, when the project, the bead or the image `n` does not exist or the image is not available, and SHALL NOT take a path from the client.

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

### REQ-BEADS-029: Images panel
WHEN a bead has images (REQ-BEADS-002 `images`), the bead page, the epic page and the details panel SHALL show under the description a panel "Images (<count>)" with one tile per image in the order of `n`, each with its number and its caption: the image itself, loaded lazily from REQ-BEADS-028 with the caption as `alt`, for an available image, and "Not on this host" with the path as written for one that is not. Clicking or pressing Enter on an available tile SHALL open the lightbox of REQ-BEADS-030 on that image. The panel SHALL NOT show for a bead without images, and its tiles SHALL wrap so that the page does not scroll sideways at 390px.

#### Scenario: Two images, one missing
- GIVEN bug `a-1` with image 1 available and caption `01.png`, and image 2 not available with path `/tmp/x.png`
- WHEN its page is shown
- THEN the panel reads "Images (2)", tile 1 shows the image with `alt` `01.png`, and tile 2 reads "Not on this host" and `/tmp/x.png`

#### Scenario: No images
- GIVEN a bead whose `images` is empty
- WHEN its page is shown
- THEN there is no Images panel

### REQ-BEADS-030: Image lightbox
The lightbox SHALL be a modal dialog that shows one available image of the bead large, its caption, "<k> of <m>" counting the available images, and a link "Open original" to its address of REQ-BEADS-028 opening in a new tab. WHILE it is open, ← and → SHALL show the previous and the next available image, without wrapping, and Escape or the close button SHALL close it and return the focus to the tile or link that opened it.

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

## MODIFIED

### REQ-BEADS-001: Bead list
<!-- base: 81461c32148e85d460397f9e0bfada5e58353164095317eaefa670f808844cb6 -->
WHEN a client requests `GET /api/beads?project=<name>`, the server SHALL return the beads of that configured project, each with `id`, `title`, `status`, `priority`, `issue_type`, `labels`, `owner`, `assignee`, `parent`, `created_at`, `updated_at`, `dependency_count`, `dependent_count`, `comment_count`, `milestone` (the id of the nearest bead of type `milestone` among the bead and its ancestors, found over every bead of the export whether closed or not, or `null`), `kind` (for an epic, `technical` or `parity` from its `kind:` label, else `capability`; `null` for any other type), `capabilities` (the names on the `Capabilities:` line of the bead's description, split by commas, without a trailing `(new)`, together with the lower-cased `<CAP>` of each `req:REQ-<CAP>-<NNN>` label of the bead and, for an epic, of its children, sorted and without duplicates) `complexity` (`low`, `medium` or `high` from a `Complexity:` line of the bead's description, or `null`), `estimate_minutes` (the bead's `estimated_minutes` when above 0, or `null`), `points` (the bead's `metadata.points` when it is one of the whole numbers 1, 2, 3, 5, 8, 13 and 21, or `null`) and `points_reason` (the bead's `metadata.points_reason` when it is a string and `points` is set, or `null`) and `image_count` (the number of its images of REQ-BEADS-026 that are available as REQ-BEADS-027 says, worked out once per export snapshot), and without the description, SHALL leave out closed beads unless the request has `closed=1`, and SHALL respond 404 when the project is not configured or its directory does not exist.

#### Scenario: Open beads by default
- GIVEN a project with 3 open, 1 in-progress and 4 closed beads
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN 4 beads are returned and none is closed

#### Scenario: Closed beads on request
- GIVEN the same project
- WHEN a client requests `GET /api/beads?project=<name>&closed=1`
- THEN all 8 beads are returned

#### Scenario: Unknown project
- GIVEN no project named `nope`
- WHEN a client requests `GET /api/beads?project=nope`
- THEN the response is 404

#### Scenario: Missing directory
- GIVEN a configured project whose directory does not exist
- WHEN a client requests its beads
- THEN the response is 404

#### Scenario: Milestone of a bead
- GIVEN milestone `m2`, its closed epic `e1`, and an open task `e1.1` under `e1`
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN `e1.1` has `milestone` `m2`, `m2` has `milestone` `m2`, and a bead under no milestone has `milestone` `null`

#### Scenario: Kind, capabilities and estimate
- GIVEN epic `e-1` labelled `kind:technical` with the description lines `Capabilities: beads, ui (new)` and `Complexity: medium (two views)` and `estimated_minutes: 960`, and its track `t-1` labelled `req:REQ-MILESTONE-UI-019`
- WHEN a client requests `GET /api/beads?project=p`
- THEN `e-1` has `kind: "technical"`, `capabilities: ["beads", "milestone-ui", "ui"]`, `complexity: "medium"` and `estimate_minutes: 960`, and `t-1` has `kind: null` and `capabilities: ["milestone-ui"]`

#### Scenario: Defaults
- GIVEN epic `e-2` without a `kind:` label, a `Capabilities:` line or `req:` labels
- WHEN a client requests the beads
- THEN `e-2` has `kind: "capability"`, `capabilities: []`, `complexity: null` and `estimate_minutes: null`

#### Scenario: Story points
- GIVEN epic `e-1` whose metadata has `points: 5` and `points_reason: "new endpoint and UI"`, epic `e-2` whose metadata has `points: 4`, and epic `e-3` whose metadata has `points: "5"`
- WHEN a client requests the list
- THEN `e-1` has `points: 5` and that `points_reason`, and `e-2` and `e-3` have `points: null` and `points_reason: null`

#### Scenario: Image count
- GIVEN bug `b-1` naming 3 images of which 2 are available, and a task naming none
- WHEN a client requests the list
- THEN `b-1` has `image_count: 2` and the task `image_count: 0`

### REQ-BEADS-002: Bead detail
<!-- base: 9e07b166282a2f87ba4c63ab9bfb811aaefd75d14036195894597a1cee64468d -->
WHEN a client requests `GET /api/beads/{project}/{id}`, the server SHALL return the bead with the fields of REQ-BEADS-001 plus `description`, `dependencies` and `dependents` (each with `id`, `title`, `status` and `type`, where `type` is `blocks` or `parent-child`), `bugs` (each bead of type `bug` that has a `discovered-from` dependency on this bead, open or closed, with `id`, `title`, `status` and `type` `discovered-from`) `images` (the images of REQ-BEADS-026, each with `n`, `path`, `caption` and `available` as REQ-BEADS-027 says) and, for an epic, `children` (each with `id`, `title`, `status` and `prep`, closed children included), and SHALL respond 404 when the project or the bead does not exist. A bead SHALL be a prep task when its `labels` hold `prep` and no label starts with `track:` or `req:`. The children of an epic that are not prep tasks are its tracks. The `prep` field of a child SHALL be true for a prep task and false for a track.

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
- THEN `images` is `{n: 1, path: "qa/evidence/r1/01.png", caption: "01.png", available: true}` and `{n: 2, path: "/tmp/x.png", caption: "x.png", available: false}`

### REQ-UI-028: Bead detail
<!-- base: a720e49ea2cc80cc0c6e8dc00321c69f28a0ff470e0163db2fa36e0722b952df -->
The bead page SHALL show the bead's id, title and type, a line of facts with its state as REQ-UI-064 describes (for example "In progress", never the raw `in_progress`; for a milestone, its milestone status as REQ-MILESTONE-UI-022 describes), its priority as `P<n>` (REQ-UI-110) and its size as REQ-UI-110 describes, the reason of its points (`points_reason`) on its own line under that line, its labels, and its assignee (REQ-UI-135), creator (the person of `created_by`, else of `owner`, REQ-BEADS-023), creation and update times and comment count as label/value pairs (REQ-UI-110), each time written as REQ-UI-131 describes, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with the strand of its tracks (REQ-UI-138), from its `child_counts` (REQ-UI-130), when it has a track. WHEN an epic has prep tasks (REQ-BEADS-002), the bead page SHALL show "Prep x/y" next to the strand, where x is its closed prep tasks and y all its prep tasks, and SHALL mark each prep task in the children list with the word "Prep" (REQ-UI-140). Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text, except a link to an available image of the bead (REQ-BEADS-026, REQ-BEADS-027), which SHALL open the lightbox of REQ-BEADS-030 on it. A Markdown image that names an available image of the bead SHALL show that image from REQ-BEADS-028, at most 24rem high and never wider than the description, with its alt text, and SHALL open the lightbox when clicked. Wherever the console renders Markdown, an image whose address is `http` or `https` SHALL NOT be loaded and SHALL be shown as a link "Image: <alt> (<host>)" opening in a new tab, and any other image SHALL be shown as its alt text.
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

#### Scenario: External image not loaded
- GIVEN a bead with a description containing `![chart](https://example.com/x.png)` and `![key](attachment:ab12)`
- WHEN the page loads
- THEN "Image: chart (example.com)" is a link to `https://example.com/x.png` in a new tab, "key" is text, no `img` element is in the description and no request goes to example.com

#### Scenario: Link to a bead image
- GIVEN a bug with `[BUG-5.png](file:///srv/att/BUG-5.png)` whose image 1 is that file, available
- WHEN the user activates "BUG-5.png"
- THEN the lightbox opens on image 1

### REQ-UI-066: Count indicators
<!-- base: c8fc9fe1d90ea420b0950525f0cb7cbbd853272a86b869474bfbafd5bb78020e -->
WHERE a bead has comments, dependencies or images, a bead card, a list row and a Tree row SHALL show a comment indicator, an icon with the count of comments, a dependency indicator, an icon with the count of dependencies, and an image indicator, an icon with `image_count` (REQ-BEADS-001), each with an accessible label such as "3 comments", "2 dependencies" or "1 image", SHALL show the comment indicator in a stronger style than the dependency one using no colour outside the palette, and SHALL show no indicator, nor a text such as "0 comments" or "0 deps", whose count is 0.

#### Scenario: Comments
- GIVEN a bead with `comment_count` 3
- WHEN its card is shown
- THEN a comment indicator with the label "3 comments" and the number 3 is shown

#### Scenario: Nothing to show
- GIVEN a bead with `comment_count` 0 and `dependency_count` 0
- WHEN its card, list row and Tree row are shown
- THEN no indicator and no "0 comments" or "0 deps" text appears

#### Scenario: Images
- GIVEN a bead with `image_count` 2
- WHEN its card and its list row are shown
- THEN each shows an image indicator with the label "2 images" and the number 2

### REQ-UI-132: Tooltips for marks and counts
<!-- base: cb96c267e228774282d273e48d3fa9d57541075b9aedd7d60cce254a5c50b87b -->
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
- THEN a tooltip says that it counts the screenshots the bead names that exist on the console host
