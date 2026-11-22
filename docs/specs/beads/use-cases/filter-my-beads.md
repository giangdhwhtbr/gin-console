# Filter my beads

Actor: Team member
Trigger: The team member wants to see only the beads assigned to them on the Beads page or the Beads tab of a milestone.
Requirements: REQ-BEADS-024, REQ-BEADS-023, REQ-UI-082, REQ-UI-135

## Goal

See one's own beads, whether they were assigned by handle or by email, without picking one's name from the list.

## Preconditions

- The team member has entered their email on the login screen (REQ-UI-097).

## Main flow
1. The team member opens the Assignee filter.
2. The system lists "Me" first, then "Unassigned" when a loaded bead has no assignee, then each person once.
3. The team member selects "Me".
4. The system keeps `assignee=me` in the URL and shows the beads whose assignee is the same person as the email, by handle or by email.

## Alternative flows
### 3a. The team member selects a person or "Unassigned"
1. The system keeps that person's handle or `unassigned` in the URL and shows that person's beads, or the beads without an assignee whatever their owner.
2. Use case ends.

### 4a. No bead is assigned to the team member
1. The system shows the empty state of the view with the filter still selected.
2. Use case ends.

## Business rules

- REQ-BEADS-023 decides when an email and a handle are the same person.
- REQ-UI-135: the owner never stands in for the assignee.

## Postconditions

- The URL holds `assignee=me`, so the same link shows each viewer their own beads.
