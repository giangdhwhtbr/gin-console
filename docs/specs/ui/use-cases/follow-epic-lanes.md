# Follow an epic's lanes

Actor: Team lead
Trigger: The team lead wants to know who runs which tracks of an epic, how far each lane is, and which lane waits for another lane's merge.
Requirements: REQ-UI-111, REQ-UI-112, REQ-UI-113, REQ-UI-114, REQ-UI-115, REQ-UI-116, REQ-UI-117, REQ-UI-118, REQ-UI-119, REQ-UI-121, REQ-BEADS-019

## Goal

See an epic's lanes, their holders, leases, progress and waits at a glance, and open any track from there.

## Preconditions

- The project runs gin-workflow team mode, and the epic's tracks were orchestrated with lanes (`Lane:` lines or `lane:` labels).
- The console reads the project's Beads export.

## Main flow
1. The team lead opens the Beads views with the epic as the scope, or the Lanes tab of the epic's page (REQ-UI-119).
2. The system offers the Lanes tab beside Graph.
3. The team lead chooses Lanes.
4. The system shows one row per lane and a "No lane" row, each with its state, holder, lease and closed count, the tracks as cards in dependency order, and the arrows with Waiting or Merged markers between lanes.
5. The team lead selects a card.
6. The system shows the track's details panel.

## Alternative flows
### 2a. No track of the epic has a lane
1. The system offers no Lanes tab; a Lanes URL says "Lanes show for an epic whose tracks have lanes" with a link to Graph.
2. Use case ends.

### 4a. The filters match no track
1. The system says "No beads match these filters".
2. Use case ends.

### 4b. A merge gate waits for a track that is not in the epic
1. The system draws a "Waiting for track <N>" or "Merged track <N>" marker above the waiting card instead of an arrow.
2. Resume at step 5.

### 3a. The team lead chooses Graph instead of Lanes
1. The system draws each lane as a coloured box, the boxes in tiers by the dependencies between lanes, the tracks left to right inside each box, and a Waiting or Merged chip on each arrow through a merge gate (REQ-UI-117, REQ-UI-118).
2. Resume at step 5.

## Business rules

- REQ-UI-112: a lane's state is the first of All tracks closed, Running, Waiting for <lanes>, Blocked, Not started, Idle that holds.
- REQ-UI-116: merge gates are never cards; they show as markers here and as gate nodes in the Graph.
- The console is read-only: claiming, handing off or releasing a lane stays in `gin team`.

## Postconditions

- Nothing is changed in the project or its Beads.
