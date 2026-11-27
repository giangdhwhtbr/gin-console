# See a bug's screenshots

Actor: Developer
Secondary actors: QA
Trigger: A developer opens a bug, or a bead with screenshots, to see what failed.
Requirements: REQ-BEADS-001, REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-028, REQ-BEADS-029, REQ-BEADS-030, REQ-UI-028, REQ-UI-066, REQ-UI-132, REQ-CONFIG-008

## Goal

See the screenshots a bead names, large and in order, when the files are on the console host.

## Preconditions

- The project is configured; its beads are exported to `.beads/issues.jsonl`; the screenshots sit in the project folder or in a folder of its `evidence_roots`.

## Main flow
1. The developer sees the image indicator on a card or a List row and opens the bead.
2. The system finds the image paths the bead names and checks which files are available.
3. The system shows the available images in the description and as numbered tiles of the Images panel.
4. The developer opens a tile.
5. The system shows the image large in the lightbox with its caption and "k of m".
6. The developer steps with ← and → and closes the lightbox with Escape.

## Alternative flows
### 2a. A named file is missing, outside the allowed folders or not an image
1. The system shows that tile as "Not on this host" with the path as written, and leaves it out of the count and of the lightbox.
2. Resume at step 3.

### 3a. The description holds an image at an external address
1. The system does not load it and shows the link "Image: <alt> (<host>)".
2. Resume at step 3.

### 4a. The developer opens "Open original"
1. The system opens the image alone in a new tab.
2. Use case ends.

## Exception flows
### 5e. The file was removed since the export was read
1. The system answers 404 for the image and the tile shows "Not on this host".
2. Use case ends.

## Business rules

- REQ-BEADS-026 defines which paths are the images of a bead.
- REQ-BEADS-027 defines when an image may be served.

## Postconditions

- Nothing changes in the project, its files or Beads.
