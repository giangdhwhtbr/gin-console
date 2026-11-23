# Read a definition

Actor: Team member
Secondary actors: PM
Trigger: A number, mark or badge on a page is not clear to the reader.
Requirements: REQ-UI-132, REQ-UI-133, REQ-UI-134

## Goal

Learn what a state mark, badge or count means, and by which rule a number is counted, without leaving the page.

## Preconditions

- The Beads page, the Milestones list, a milestone page, or the Reports page is shown.

## Main flow
1. The team member rests the pointer on a mark or count, or moves the keyboard focus to it.
2. The system shows a tooltip with one sentence that says what it means and, for a count, its rule and scope.
3. The team member moves the pointer or the focus away, or presses Escape.
4. The system closes the tooltip.

## Alternative flows
### 1a. The team member uses a phone, or the mark does not take focus
1. The team member opens "Legend" in the page header.
2. The system shows the panel with every mark and definition of the page.
3. The team member closes it with Escape, a tap outside or the control.
4. Use case ends.

## Business rules

- REQ-BEADS-021, REQ-BEADS-022 and REQ-MILESTONE-UI-023 give the rules the definitions state.

## Postconditions

- Nothing changes in the page or the URL.
