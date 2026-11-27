# Evidence images from local files

Epic: gin-console-rm-evidence-images
Kind: capability
Points: 5 (6 new and 5 modified REQs: image paths in four written forms, path safety over the project folder and listed folders, one endpoint, an Images panel and a lightbox, a count on cards and rows, one config field; same size as gin-console-rm-wbs-export = 5; was 3 at the roadmap)
Date: 2026-11-26

## Why

A bug names its screenshots as file paths, but the console shows them as text: `MarkdownView` drops every image address that is not `http` or `https`, and the bead page has no gallery. Someone triaging a bug opens a terminal to find the file. Meanwhile an image at an external `https` address in a description does load, so opening a bead can call out to any host.

Goal and scope after the epic's comments: Show a bug's screenshots now, when the console host has the files. Navigation shell shipped (merge `2ca8410`, 2026-11-21); the images use the bead page and the details panel it left in place. The images served from the shared attachment store (`attachment:<sha>`, gin-workflow-s6fv, shipped) stay with gin-console-rm-shared-attachments, which reuses the panel and the lightbox of this epic.

Comments considered: 1, latest 2026-11-21T16:00:26Z

Facts measured on 2026-11-26:
- gin-console: 10 image paths in bead texts, 5 of them on this host, all inside the project folder (gin-qa writes `qa/evidence/<run>/<tc-id>/NN.png`, git-ignored).
- qwikfone: 105 image paths in 37 beads; 48 bug images exist on this host and 47 of them are outside the project folder (35 under `/home/gin/infra/bug-sync-mcp/data/attachments`, the rest under `~/brain/qwikfone`). Its bugs list them under `## Evidence & Image Attachments` as `file://` links with an "Absolute Path" line.
- gin-qa 3.5.3 writes `## Evidence` with `- ![<label>](attachment:<sha>)` and `  local: <path>` per screenshot, or `- <path>` when the upload fails; the label reads `<TC-ID> step <n>: <title>`.
- Sizes: the largest image is 1.0 MB, the median 104 to 238 KB.

User decisions 2026-11-26:
- **Folders:** the project folder and the folders listed per project in `evidence_roots` of the config.
- **Paths:** every image path in the description and notes of any bead, in any of the written forms; the panel is named Images.
- **Architecture:** the backend finds the images of each bead and serves the n-th image of a bead; the browser never sends a path.

Assumptions (defaults taken without a question):
- Image types are PNG, JPEG, GIF and WebP, told by their first bytes; SVG is left out (no magic bytes, can carry scripts).
- At most 10 MB per image and 50 images per bead.
- A path holds no spaces unless written as a Markdown image or link target; `file://` addresses are percent-decoded.
- `~` is the home folder of the user running the console.
- Design, acceptance criteria and comments are not searched for images.
- `attachment:<sha>` images keep showing as their text.

## What Changes

- **Config:** `evidence_roots` per project.
- **Backend:** each bead's images with `available`, `image_count` on list rows, `images` on the detail, and `GET /api/beads/{project}/{id}/images/{n}`.
- **Bead page and details panel:** images inline in the description, an Images panel of numbered thumbnails, a lightbox.
- **Cards and rows:** an image indicator with its count.
- **Every Markdown view:** external images no longer load; they show as a link.

## User Stories

### US-1: See a bug's screenshots
As a developer triaging a bug, I want the screenshots the bug names shown on its page, so that I see what failed without looking for the files.
REQ: REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-028, REQ-BEADS-029, REQ-UI-028, REQ-CONFIG-008

Acceptance criteria:
- A bug whose description names `qa/evidence/<run>/tc-ui-115/01.png`, present on the host, shows that image in its description and as thumbnail 1 of the Images panel.
- A qwikfone bug that links `file:///home/gin/infra/bug-sync-mcp/data/attachments/BUG-005_1.png` shows it when that folder is listed in `evidence_roots`, and "Not on this host" when it is not.
- A path outside the allowed folders, a symlink that leads outside them, a file over 10 MB and a file that is not an image are never served.

### US-2: Look through the screenshots
As a QA, I want to open the screenshots large and step through them, so that I compare the steps of a failed case.
REQ: REQ-BEADS-030

Acceptance criteria:
- Clicking a thumbnail opens it large with its caption and "n of m"; ← and → move between the available images; Escape closes and the focus returns to the thumbnail.
- "Open original" opens the image alone in a new tab.

### US-3: Spot beads with screenshots
As a lead, I want cards and rows to show how many screenshots a bead has, so that I open the ones with evidence first.
REQ: REQ-BEADS-001, REQ-UI-066, REQ-UI-132

Acceptance criteria:
- A card and a List row show an image indicator with the number of images present on the host, with a tooltip, and nothing when there are none.

### US-4: No calls to outside hosts
As a user of the console, I want images at external addresses not to load, so that opening a bead does not call any outside host.
REQ: REQ-UI-028

Acceptance criteria:
- `![chart](https://example.com/x.png)` in a description shows as the link "Image: chart (example.com)" and no request goes to example.com.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `beads` | `REQ-BEADS-026`, `REQ-BEADS-027`, `REQ-BEADS-028`, `REQ-BEADS-029`, `REQ-BEADS-030`; modified `REQ-BEADS-001`, `REQ-BEADS-002` | `docs/specs/beads/diagrams/bead-images-activity.md`, `docs/specs/beads/use-cases/see-bug-screenshots.md` |
| `ui` | modified `REQ-UI-028`, `REQ-UI-066`, `REQ-UI-132` | none |
| `config` | `REQ-CONFIG-008` | `docs/specs/config/diagrams/evidence-folders-activity.md` |

## Non-goals

- Images from the shared attachment store (`attachment:<sha>`): gin-console-rm-shared-attachments.
- Uploading, editing or deleting images; images in comments.
- Files on other machines.

## Success Criteria

- On this host, the bug gin-console-3kd shows its screenshot, and with `evidence_roots` set for qwikfone, its bugs show the screenshots of bug-sync-mcp.
- No request for an image leaves the console host when a description holds an external image address.
- `pytest`, `ruff`, `mypy`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test, and `gin-qa cases check --change gin-console-rm-evidence-images` prints `ok`.
