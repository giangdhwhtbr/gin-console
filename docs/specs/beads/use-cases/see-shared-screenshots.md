# See shared screenshots

Actor: Team member
Secondary actors: Git remote
Trigger: A team member opens a bead whose screenshots were attached with `gin attach add`, on this host or another one.
Requirements: REQ-BEADS-002, REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-028, REQ-BEADS-029, REQ-BEADS-030, REQ-BEADS-031, REQ-BEADS-032, REQ-BEADS-033, REQ-BEADS-034, REQ-BEADS-035, REQ-UI-028

## Goal

See the screenshots attached to a bead, whoever took them, without fetching the attachment store by hand.

## Preconditions

- The project is configured and does not set `pull: false`; its `origin` holds `refs/gin/attachments`, and the bead's entries reached this host through `bd dolt pull`.

## Main flow
1. The team member activates "Refresh data", or the scheduled pull runs.
2. The system pulls the project's beads and then fetches the shared attachment store into its own ref.
3. The team member opens the bead.
4. The system finds the bead's images, takes each attachment with its `local:` line as one image, and checks which attachments are present.
5. The system shows the available images in the description and as numbered tiles of the Images panel, each attachment from its address by hash.
6. The team member opens a tile.
7. The system checks the blob's hash, type and size and shows the image large in the lightbox.

## Alternative flows
### 2a. The fetch fails
1. The system keeps the error and shows the note "Fetching attachments of <project> failed" with the `git fetch` command to run by hand.
2. Resume at step 3.

### 2b. The remote has no attachment store or there is no `origin`
1. The system records `no_store` or `no_remote` and shows no note.
2. Resume at step 3.

### 4a. An attachment is not fetched, was pruned, sits in another store or is not listed on the bead
1. The system shows the attachment's file when its `local:` line names an available file; otherwise it shows the tile with the reason and leaves it out of the count and of the lightbox.
2. Resume at step 5.

## Exception flows
### 7e. The blob does not match its hash, is not an image or is over 10 MB
1. The system answers 404 and the tile shows the caption instead of the image.
2. Use case ends.

## Business rules

- REQ-BEADS-026 defines which files and attachments are the images of a bead.
- REQ-BEADS-031 defines when an attachment is present, and REQ-BEADS-027 when an image is available.
- REQ-BEADS-035 lists the only git commands the console runs.

## Postconditions

- Nothing changes in the project's branches, tags, `refs/gin/*` refs or Beads; only `refs/gin-console/attachments` may move.
