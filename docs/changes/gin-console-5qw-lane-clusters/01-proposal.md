# Lane clusters

Epic: gin-console-5qw
Kind: capability
Date: 2026-11-20

## Why

After epic gin-console-9ix, the Graph view of an epic with lanes draws every track as its own node with a small lane chip, and a merge gate (the placeholder that waits for another lane's pull request) as a dashed node that looks like any other bead. On 2026-11-20 the user found this confusing and asked for lanes drawn as containers with a background colour per lane, with a mockup.

User decisions 2026-11-20:
- Change the Graph view only. The Lanes view and the lane chips elsewhere stay as they are.
- Variant B of the mockup, "lanes as clusters" (`docs/specs/ui/assets/2026-11-20/`):
  - One box per lane, laid out by the dependencies between lanes, with tracks left to right inside each box.
  - Merge gates are no longer nodes. They become Waiting/Merged chips on the arrows between lanes.
  - Tracks without a lane go in a neutral dashed "No lane" box.

## What Changes

- **Graph view of a scope with lanes:**
  - **Boxes:** lane boxes in tiers by the dependencies between lanes.
  - **Cards:** tracks left to right inside each box by their dependency layer.
  - **Arrows:** card to card inside a lane, and card to box between lanes. A Waiting or Merged chip replaces each merge gate node.
  - **Unchanged:** the Graph view of other scopes.
- **Box header:** colour swatch, lane name and state; then holder, lease and closed/total. These are the facts of the Lanes view header.
- **Lane colours:** eight categorical lane colours, with light and dark steps validated for colour-vision separation, given by lane name. A pale tint fills the box and a stronger tone draws its border. Text always keeps the text colours.

## User Stories

### US-1: See the lanes of an epic in its graph
As a team lead, I want the Graph of an epic with lanes to group each lane's tracks in one coloured box, so that I can tell the lanes apart and see which lane waits for which without reading every chip.
REQ: REQ-UI-117, REQ-UI-118

Acceptance criteria:
- In the Graph of `ex-e12`, boxes be, fe and infra are on the first tier, and qa then "No lane" are on the tier below.
- Each box has its own background colour and a header that names the lane and its state.
- Track 1 → track 2 runs left to right inside the be box.

### US-2: Merge gates read as waits, not as work
As a team member, I want a merge gate shown as a Waiting or Merged chip on the arrow between two lanes, so that I do not take it for a bead someone works on.
REQ: REQ-UI-117, REQ-UI-116

Acceptance criteria:
- In the Graph of `ex-e12` no node reads "Waits for … to merge".
- The arrow from track 2 to the qa box carries "Waiting · be #2", and the arrow from track 3 carries "Merged · fe #3".
- At project scope, a merge gate without a parent is still drawn as a dashed node.

## Capabilities Affected

- `ui`:
  - ADDED REQ-UI-117, REQ-UI-118; MODIFIED REQ-UI-116.
  - Assets: `docs/specs/ui/assets/2026-11-20/mockup/index.html`, `docs/specs/ui/assets/2026-11-20/shots/b-light.png`, `docs/specs/ui/assets/2026-11-20/shots/b-dark.png`.
  - Diagram: `docs/specs/ui/diagrams/lane-clusters-activity.md`.
  - Use case: `docs/specs/ui/use-cases/follow-epic-lanes.md` (its Requirements gain REQ-UI-117 and REQ-UI-118).

## Assumptions

- The lane chips of the List, Board, Focus, Gantt and bead page, and the Lanes view, keep their look; only the Graph boxes use the lane colours.
- The switch "Only linked" (REQ-UI-081) is not offered while lane boxes are drawn; every drawn track has its box.
- An epic with more than eight lanes reuses the colours from the first slot. The name in each header keeps the lanes apart.
- Within a tier, boxes keep the row order of the Lanes view (REQ-UI-111).

## Non-goals

- Lane colours anywhere other than the Graph view.
- Collapsing or resizing a lane box.
- Pull request state of a lane.

## Success Criteria

- Every scenario of REQ-UI-117, REQ-UI-118 and the modified REQ-UI-116 has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console: the readability check reports no finding on the Graph of `ex-e12` at 390, 1024, 1440 and 1920px in both themes, and screenshots at 390 and 1440px match the chosen mockup.
