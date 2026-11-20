# Spec Delta: Lane clusters

## ADDED

### REQ-UI-117: Lane clusters in the Graph view
WHILE the scope of the Graph view (REQ-UI-106) has a loaded child that is not a merge gate and whose `lane` is not `null` (REQ-BEADS-019, the condition of the Lanes tab in REQ-UI-111), the Graph view SHALL draw, instead of the layers of REQ-UI-048:
- one box per lane of the scope's children that are not merge gates, holding the cards of its drawn tracks, and one dashed "No lane" box for the drawn children without a lane;
- the boxes in tiers: a box, the "No lane" box included, is in the tier after every box whose tracks its tracks wait for, directly or through a merge gate (REQ-UI-111); the boxes of one tier are in the row order of the Lanes view; the "No lane" box comes last in its tier, and in the last tier when none of its tracks depends on or blocks a track of a lane; lanes that wait for each other in a loop share one tier;
- the cards inside a box from left to right by their dependency layer within the lane, the cards of one layer one under another;
- an arrow between two cards of one box for each dependency between them, and an arrow from a card to the top edge of the box of another lane for each dependency of that lane's tracks on it, directly or through a merge gate, so that no dependency between drawn cards goes without an arrow; an arrow to a box that is not in a later tier (lanes in a loop) runs in a channel to the right of every box;
- no node for a merge gate, but a chip on its arrow: "Waiting · <lane> #<N>" on a dashed arrow while the gate is not closed, "Merged · <lane> #<N>" when it is closed (`<lane>` and `<N>` from its `waits_for`); and, for a gate whose track is not drawn, the chip "Waiting for track <N>" or "Merged track <N>" on the top edge of the waiting box.

The view SHALL leave out a box with no drawn card, SHALL NOT offer the switch "Only linked" (REQ-UI-081) and SHALL keep the selection, details panel, Escape, opening and screen-reader list of REQ-UI-051, REQ-UI-052, REQ-UI-054 and REQ-UI-106. WHEN a card has focus, Arrow Left and Arrow Right SHALL move to the previous or next card of its box, and Arrow Up and Arrow Down to the card that an arrow of the focused card comes from in the tier above or leads to in the tier below, the nearest by x when there are several, else to the card of the tier above or below nearest by x. No arrow, chip or box SHALL be drawn over a card or over the text of a header.
Source: `assets/2026-11-20/mockup/index.html`, `assets/2026-11-20/shots/b-light.png`

#### Scenario: Boxes in tiers
- GIVEN epic `ex-e12` with lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6), qa (track 4, waiting for tracks 2 and 3 through merge gates) and two tracks without a lane, with "Show closed" on
- WHEN the user opens the Graph view with `scope=ex-e12`
- THEN boxes be, fe and infra are in the first tier, qa and then "No lane" are in the second tier, and no node reads "Waits for"

#### Scenario: Tracks left to right
- GIVEN track 2 of lane be blocked by track 1
- WHEN the Graph of `ex-e12` is shown
- THEN the card of track 2 is right of the card of track 1 inside the be box, with an arrow from track 1 to track 2

#### Scenario: Gate chips
- GIVEN track 4 of lane qa blocked by an open merge gate waiting for track 2 of lane be and a closed one waiting for track 3 of lane fe
- WHEN the Graph of `ex-e12` is shown
- THEN a dashed arrow from track 2 to the qa box carries "Waiting · be #2", and an arrow from track 3 to the qa box carries "Merged · fe #3"

#### Scenario: Track not drawn
- GIVEN a merge gate titled `external: .planning/plans/other.md#7` that blocks track 4 and whose track is not a child of `ex-e12`
- WHEN the Graph of `ex-e12` is shown
- THEN the chip "Waiting for track 7" is on the top edge of the qa box and no arrow is drawn for it

#### Scenario: No lane box with dependencies
- GIVEN a track without a lane that is blocked by track 2 of lane be, and a track of lane fe blocked by another track without a lane
- WHEN the Graph view of the scope is shown
- THEN the "No lane" box is in the tier after be, and an arrow runs from track 2 to the "No lane" box and another from the "No lane" track to the fe box

#### Scenario: Lanes in a loop
- GIVEN lane x with a track blocked by a track of lane y, and lane y with a track blocked by a track of lane x
- WHEN the Graph view of the scope is shown
- THEN boxes x and y share a tier, both arrows are drawn in the channel to the right of the boxes, and the cycle warning names x and y

#### Scenario: Scope without lanes
- GIVEN epic `ex-e3`, whose tracks have no lane
- WHEN the user opens its Graph view
- THEN the nodes are drawn in layers as in REQ-UI-048 with no box, and the switch "Only linked" is offered

#### Scenario: Keys between boxes
- GIVEN the focus on track 2 in the be box
- WHEN the user presses Arrow Down
- THEN the focus and the selection move to track 4 in the qa box, and the details panel shows it

### REQ-UI-118: Lane box header and colours
Each lane box of REQ-UI-117 SHALL show a header with a colour swatch, the lane name in a heavier weight and the lane's state as an icon and words (REQ-UI-112) on its first line, and the holder, the lease and "<closed>/<total> closed" (REQ-UI-112) in the muted colour on its second line, cut with an ellipsis and with the full text as `title`. The box SHALL have a background tint and a border in the lane's colour: lane colour `k` of eight categorical colours with a light and a dark step each, `k` being the position of the lane name among the names of the scope's lanes sorted, counted again from 1 after 8, so that a filter never changes a lane's colour. Text in a box SHALL keep the text colours, never the lane colour, at a contrast of at least 4.5:1 (REQ-UI-110). The "No lane" box SHALL have a dashed neutral border, no swatch and no state.
Source: `assets/2026-11-20/mockup/index.html`, `assets/2026-11-20/shots/b-dark.png`

#### Scenario: Header
- GIVEN lane be with track 1 closed and track 2 in progress held by ann with a lease until tomorrow 16:00
- WHEN the Graph of `ex-e12` is shown
- THEN the be box header reads "be" and "Running" on its first line and "ann · lease until <tomorrow> 16:00 · 1/2 closed" on its second line

#### Scenario: Colours follow the lane name
- GIVEN lanes be, fe, infra and qa, and the assignee filter showing only bao (lane fe)
- WHEN the Graph of `ex-e12` is shown with and without the filter
- THEN the fe box has lane colour 2 in both cases, and be, infra and qa have colours 1, 3 and 4 when shown

#### Scenario: No lane box
- GIVEN two tracks of `ex-e12` without a lane
- WHEN the Graph is shown
- THEN they sit in a dashed box "No lane" with "1/2 closed" and no swatch or state

## MODIFIED

### REQ-UI-116: Merge gates in the views
<!-- base: cc77932357ec6e36b49630c6fefc806a1183919de0e93e1d89606a8f07aecf5e -->
The List, Board, Focus and My Tasks views SHALL NOT show merge gates (REQ-BEADS-019), and no count of children or tracks that the frontend shows ("n of m done" of a Graph node, the child counts of a List row and of a bead page) SHALL count them. WHILE the Graph view draws no lane boxes (REQ-UI-117), it SHALL draw a merge gate as a node with a dashed border and a merge icon that reads, in place of its title, "Waits for <lane> #<N> to merge" (`<lane>` its `waits_for.lane`, else "track" without the `#`) and, in place of its state, "Waiting" while it is not closed or "Merged" when it is closed; WHILE it draws lane boxes, a merge gate SHALL be a chip on an arrow as in REQ-UI-117. The bead page of a merge gate SHALL show the same words as its title and state, keep its own title as a fact "Placeholder", and add the fact "Waits for" with the plan path and the track number. In the Dependencies of a bead page (REQ-UI-028), a merge gate SHALL read "Waits for <lane> #<N> · merge pending" or "Waits for <lane> #<N> · merged", with `<lane> #<N>` written as on its Graph node.

#### Scenario: Not on the Board
- GIVEN an open merge gate without blockers and an open task without blockers
- WHEN the user opens the Board, List and Focus views
- THEN the task is shown and the merge gate is not

#### Scenario: Not counted as a child
- GIVEN epic `ex-e12` with 8 tracks and a merge gate whose parent is `ex-e12`
- WHEN its Graph node is shown in the project scope
- THEN it reads "n of 8 done"

#### Scenario: Merge gate node
- GIVEN the closed merge gate `ex-g3` without a parent, waiting for track 3 of lane `fe`, and "Show closed" on
- WHEN the Graph view of the project is shown
- THEN the gate is a dashed node with a merge icon reading "Waits for fe #3 to merge" and "Merged"

#### Scenario: Merge gate chip in lane boxes
- GIVEN an open merge gate waiting for track 2 of lane `be`, in the Graph view of `ex-e12`
- WHEN the view is shown
- THEN no node reads "Waits for be #2 to merge" and the arrow from track 2 to the qa box carries "Waiting · be #2"

#### Scenario: Dependencies of a track
- GIVEN track 4 blocked by an open merge gate waiting for track 2 of lane `be` and a closed one waiting for track 3 of lane `fe`
- WHEN the bead page of track 4 is shown
- THEN its Dependencies read "Waits for be #2 · merge pending" and "Waits for fe #3 · merged"

## REMOVED
