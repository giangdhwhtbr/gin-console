# Read the verdict of a Gantt row

Actor: PM
Trigger: The PM opens the Gantt tab of a milestone
Requirements: REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-013, REQ-UI-132

## Goal

The PM sees, for each epic of a milestone, the one thing most wrong with it, and can read every warning without the row growing.

## Preconditions

- The project is configured and `gin milestone show <id> --json` answers.

## Main flow
1. The PM opens the Gantt tab of the milestone.
2. The system draws each epic as one row of fixed height with one continuous bar in the look of its state.
3. For each epic with warnings, the system shows one verdict under its label: the most severe warning, its glyph, and "+n" when the epic has n more.
4. The PM rests the pointer on a verdict, or moves the keyboard focus to it.
5. The system shows a tooltip listing every warning of the epic, most severe first.
6. The PM moves the pointer away or presses Escape, and the system closes the tooltip.

## Alternative flows
### 3a. The epic has no warning
1. The system shows no verdict for that epic, and the row keeps the same height.
2. Resume at step 4.

### 3b. The epic has exactly one warning
1. The system shows that warning as the verdict, without "+n".
2. Resume at step 4.

## Exception flows
### 1e. `gin milestone show` fails
1. The system shows the error in place of the Gantt (REQ-MILESTONE-UI-003).
2. Use case ends.

## Business rules

- The severity order and the glyph of each warning are those of REQ-MILESTONE-UI-024.
- The words of each warning are those of REQ-MILESTONE-UI-003.

## Postconditions

- No Gantt row is taller because of its warnings.
